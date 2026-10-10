import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

const getBaseUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005/api';
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Add a request interceptor to include the JWT token from cookies
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// ============================================================
// CLIENT-SIDE IN-MEMORY CACHE & REQUEST DEDUPLICATION
// Eliminates redundant waterfalls on static master endpoints
// ============================================================

const CACHEABLE_PATTERNS = [
  /^\/product-types/,
  /^\/industries/,
  /^\/branches/,
  /^\/departments/,
  /^\/measurements\/config/,
  /^\/user-types/,
  /^\/size-charts/,
];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

interface CacheEntry {
  response: AxiosResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<AxiosResponse>>();

export const clearApiCache = (pattern?: string | RegExp) => {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      memoryCache.delete(key);
    }
  }
};

const isCacheable = (url: string): boolean => {
  return CACHEABLE_PATTERNS.some((p) => p.test(url));
};

const buildCacheKey = (url: string, params?: any): string => {
  if (!params) return url;
  try {
    const searchParams = new URLSearchParams(params).toString();
    return searchParams ? `${url}?${searchParams}` : url;
  } catch {
    return url;
  }
};

// Hook into mutations to automatically invalidate affected caches
const invalidateOnMutation = (url?: string) => {
  if (!url) return;
  for (const pattern of CACHEABLE_PATTERNS) {
    if (pattern.test(url)) {
      clearApiCache(pattern);
      break;
    }
  }
};

const originalPost = api.post.bind(api);
const originalPut = api.put.bind(api);
const originalPatch = api.patch.bind(api);
const originalDelete = api.delete.bind(api);
const originalGet = api.get.bind(api);

api.post = async function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  const result = await originalPost<T, R, D>(url, data, config);
  invalidateOnMutation(url);
  return result;
} as typeof api.post;

api.put = async function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  const result = await originalPut<T, R, D>(url, data, config);
  invalidateOnMutation(url);
  return result;
} as typeof api.put;

api.patch = async function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  const result = await originalPatch<T, R, D>(url, data, config);
  invalidateOnMutation(url);
  return result;
} as typeof api.patch;

api.delete = async function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  const result = await originalDelete<T, R, D>(url, config);
  invalidateOnMutation(url);
  return result;
} as typeof api.delete;

api.get = (async function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: AxiosRequestConfig<D> & { skipCache?: boolean }
): Promise<R> {
  const shouldCache = !config?.skipCache && isCacheable(url);

  if (!shouldCache) {
    return originalGet<T, R, D>(url, config);
  }

  const cacheKey = buildCacheKey(url, config?.params);
  const now = Date.now();

  // 1. Check in-memory cache
  const cached = memoryCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    // Return shallow clone of response to prevent consumer mutation side-effects
    return {
      ...cached.response,
      data: Array.isArray(cached.response.data)
        ? [...cached.response.data]
        : typeof cached.response.data === 'object' && cached.response.data !== null
        ? { ...cached.response.data }
        : cached.response.data,
    } as unknown as R;
  }

  // 2. In-flight request deduplication (prevents parallel requests from multiple mounting components)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as unknown as Promise<R>;
  }

  const promise = originalGet<T, AxiosResponse<T>, D>(url, config)
    .then((response) => {
      memoryCache.set(cacheKey, {
        response,
        timestamp: Date.now(),
      });
      return response;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise as unknown as Promise<R>;
}) as typeof api.get;

export default api;

