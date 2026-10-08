import axios from 'axios';
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

export default api;

