"use client";

import {
  AlertCircle,
  Bell,
  Check,
  Info,
  LoaderCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ToastStatus = "neutral" | "info" | "loading" | "success" | "error";
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type AnimatedToastAction = {
  label: ReactNode;
  onClick: (toast: AnimatedToast) => void;
};

export type AnimatedToast = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  status?: ToastStatus;
  icon?: ReactNode;
  action?: AnimatedToastAction;
  duration?: number;
  dismissible?: boolean;
  createdAt?: number;
};

export type ToastInput = Omit<AnimatedToast, "id" | "createdAt"> & {
  id?: string;
};

export type ToastClassNames = {
  root?: string;
  item?: string;
  surface?: string;
  iconWrap?: string;
  content?: string;
  title?: string;
  description?: string;
  action?: string;
  close?: string;
  progress?: string;
};

export interface AnimatedToastStackProps {
  toasts: AnimatedToast[];
  onDismiss?: (id: string) => void;
  position?: ToastPosition;
  placement?: "static" | "fixed" | "absolute";
  fixed?: boolean;
  portal?: boolean;
  portalRoot?: Element | null;
  maxVisible?: number;
  className?: string;
  classNames?: ToastClassNames;
  icons?: Partial<Record<ToastStatus, ReactNode>>;
  renderToast?: (toast: AnimatedToast) => ReactNode;
}

export interface UseAnimatedToastStackOptions {
  initialToasts?: ToastInput[];
  defaultDuration?: number;
  limit?: number;
}

const STACK_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

const CONTENT_TRANSITION = {
  duration: 0.28,
  ease: EASE_OUT,
} as const;

const STATUS_ICON: Record<ToastStatus, LucideIcon> = {
  neutral: Bell,
  info: Info,
  loading: LoaderCircle,
  success: Check,
  error: AlertCircle,
};

const STATUS_CLASS: Record<ToastStatus, string> = {
  neutral: "text-zinc-600 bg-zinc-100",
  info: "text-[#2d8d9b] bg-[#2d8d9b]/10",
  loading: "text-[#2d8d9b] bg-[#2d8d9b]/10",
  success: "text-emerald-600 bg-emerald-500/10",
  error: "text-rose-600 bg-rose-500/10",
};

const POSITION_CLASS: Record<ToastPosition, string> = {
  "top-left": "left-6 top-6",
  "top-center": "left-1/2 top-6 -translate-x-1/2",
  "top-right": "right-6 top-6",
  "bottom-left": "bottom-6 left-6",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-6 right-6",
};

let idSeed = 0;

function createToast(input: ToastInput, defaultDuration: number): AnimatedToast {
  return {
    duration: defaultDuration,
    dismissible: true,
    ...input,
    id: input.id ?? `toast-${Date.now()}-${idSeed++}`,
    createdAt: Date.now(),
  };
}

export function useAnimatedToastStack({
  initialToasts = [],
  defaultDuration = 4200,
  limit,
}: UseAnimatedToastStackOptions = {}) {
  const toastTimers = useRef<Map<string, { timer: number; signature: string }>>(new Map());
  const [toasts, setToasts] = useState<AnimatedToast[]>(() =>
    initialToasts.map((toast) => createToast(toast, defaultDuration)),
  );

  const dismissToast = useCallback((id?: string) => {
    if (!id) {
      setToasts([]);
      return;
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      let activeId = input.id;
      setToasts((current) => {
        if (input.id && current.some((t) => t.id === input.id)) {
          // Toast with this ID already exists: morph/update in place!
          return current.map((t) => {
            if (t.id === input.id) {
              return {
                ...t,
                ...input,
                id: input.id,
                // If it was a loading toast (duration 0) and no new duration specified, reset to defaultDuration so it auto-dismisses
                duration:
                  input.duration !== undefined
                    ? input.duration
                    : t.duration === 0
                      ? defaultDuration
                      : t.duration,
                createdAt: Date.now(),
              };
            }
            return t;
          });
        }

        const toast = createToast(input, defaultDuration);
        activeId = toast.id;
        const next = [...current, toast];
        return typeof limit === "number" ? next.slice(-limit) : next;
      });
      return activeId ?? "";
    },
    [defaultDuration, limit],
  );

  const updateToast = useCallback(
    (id: string, patch: Partial<ToastInput>) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                ...patch,
                id,
                duration:
                  patch.duration !== undefined
                    ? patch.duration
                    : toast.duration === 0
                      ? defaultDuration
                      : toast.duration,
                createdAt: Date.now(),
              }
            : toast,
        ),
      );
    },
    [defaultDuration],
  );

  useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));

    toastTimers.current.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        window.clearTimeout(entry.timer);
        toastTimers.current.delete(id);
      }
    });

    toasts.forEach((toast) => {
      const duration = toast.duration ?? defaultDuration;
      const existing = toastTimers.current.get(toast.id);

      if (duration <= 0) {
        if (existing) {
          window.clearTimeout(existing.timer);
          toastTimers.current.delete(toast.id);
        }
        return;
      }

      const createdAt = toast.createdAt ?? Date.now();
      const signature = `${createdAt}:${duration}`;

      if (existing?.signature === signature) {
        return;
      }

      if (existing) {
        window.clearTimeout(existing.timer);
      }

      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(duration - elapsed, 0);
      const timer = window.setTimeout(() => {
        toastTimers.current.delete(toast.id);
        dismissToast(toast.id);
      }, remaining);

      toastTimers.current.set(toast.id, { timer, signature });
    });
  }, [defaultDuration, dismissToast, toasts]);

  useEffect(() => {
    const timers = toastTimers.current;

    return () => {
      timers.forEach((entry) => {
        window.clearTimeout(entry.timer);
      });
      timers.clear();
    };
  }, []);

  return useMemo(
    () => ({
      toasts,
      showToast,
      updateToast,
      dismissToast,
      clearToasts,
      setToasts,
    }),
    [clearToasts, dismissToast, showToast, toasts, updateToast],
  );
}

export function AnimatedToastStack({
  toasts,
  onDismiss,
  position = "bottom-right",
  placement,
  fixed = true,
  portal,
  portalRoot,
  maxVisible = 5,
  className,
  classNames,
  icons,
  renderToast,
}: AnimatedToastStackProps) {
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const visibleToasts = toasts.slice(-maxVisible);
  const isBottom = position.startsWith("bottom");
  const resolvedPlacement = placement ?? (fixed ? "fixed" : "static");
  const shouldPortal = portal ?? resolvedPlacement === "fixed";

  useEffect(() => {
    setPortalTarget(shouldPortal ? (portalRoot ?? document.body) : null);
  }, [portalRoot, shouldPortal]);

  const stack = (
    <ol
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "pointer-events-none flex w-[calc(100vw-2rem)] max-w-sm gap-2.5",
        isBottom ? "flex-col-reverse" : "flex-col",
        resolvedPlacement === "fixed" && "fixed z-[9999]",
        resolvedPlacement === "absolute" && "absolute z-50",
        resolvedPlacement !== "static" && POSITION_CLASS[position],
        classNames?.root,
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visibleToasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            onDismiss={onDismiss}
            classNames={classNames}
            icons={icons}
            renderToast={renderToast}
          />
        ))}
      </AnimatePresence>
    </ol>
  );

  if (shouldPortal && !portalTarget) {
    return null;
  }

  if (shouldPortal && portalTarget) {
    return createPortal(stack, portalTarget);
  }

  return stack;
}

const ToastItem = memo(function ToastItem({
  toast,
  index,
  onDismiss,
  classNames,
  icons,
  renderToast,
}: {
  toast: AnimatedToast;
  index: number;
  onDismiss?: (id: string) => void;
  classNames?: ToastClassNames;
  icons?: Partial<Record<ToastStatus, ReactNode>>;
  renderToast?: (toast: AnimatedToast) => ReactNode;
}) {
  const reduce = useReducedMotion();
  const status = toast.status ?? "neutral";
  const Icon = STATUS_ICON[status];
  const iconNode = icons?.[status] ?? toast.icon ?? <Icon className="h-4 w-4 stroke-[2.5]" />;
  const canDismiss = toast.dismissible !== false && Boolean(onDismiss);
  const hasDetails = Boolean(toast.description || toast.action);

  return (
    <motion.li
      layout
      initial={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, y: 24, scale: 0.94, filter: "blur(10px)" }
      }
      animate={
        reduce
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      }
      exit={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: 36,
              scale: 0.95,
              filter: "blur(8px)",
              transition: { duration: 0.2, ease: EASE_OUT },
            }
      }
      transition={STACK_SPRING}
      drag={canDismiss && !reduce ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (!canDismiss || !onDismiss) return;
        if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 500) {
          onDismiss(toast.id);
        }
      }}
      className={cn("pointer-events-auto relative will-change-transform", classNames?.item)}
      style={{ zIndex: 50 - index }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/95 p-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-all",
          classNames?.surface,
        )}
      >
        {renderToast ? (
          renderToast(toast)
        ) : (
          <div className={cn("flex gap-3.5", hasDetails ? "items-start" : "items-center")}>
            <motion.span
              layout
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                hasDetails && "mt-0.5",
                STATUS_CLASS[status],
                classNames?.iconWrap,
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={status}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: 8, scale: 0.8, filter: "blur(6px)" }
                  }
                  animate={
                    reduce
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                  }
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: -8, scale: 0.9, filter: "blur(6px)" }
                  }
                  transition={CONTENT_TRANSITION}
                  className="inline-flex"
                >
                  {status === "loading" ? (
                    <span className="inline-flex animate-spin">{iconNode}</span>
                  ) : (
                    iconNode
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.span>

            <div className={cn("min-w-0 flex-1", classNames?.content)}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${toast.id}-${status}-${String(toast.title)}`}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: 8, filter: "blur(6px)" }
                  }
                  animate={
                    reduce
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, filter: "blur(0px)" }
                  }
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: -8, filter: "blur(6px)" }
                  }
                  transition={CONTENT_TRANSITION}
                >
                  <p
                    className={cn(
                      "text-[13px] font-black tracking-tight text-[#3a525d] leading-snug",
                      classNames?.title,
                    )}
                  >
                    {toast.title}
                  </p>
                  {toast.description ? (
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold leading-relaxed text-zinc-500",
                        classNames?.description,
                      )}
                    >
                      {toast.description}
                    </p>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {toast.action ? (
                <button
                  type="button"
                  onClick={() => toast.action?.onClick(toast)}
                  className={cn(
                    "mt-2.5 inline-flex h-7 items-center rounded-xl bg-zinc-100 px-3 text-[11px] font-black uppercase tracking-wider text-[#3a525d] transition-all hover:bg-zinc-200 active:scale-95",
                    classNames?.action,
                  )}
                >
                  {toast.action.label}
                </button>
              ) : null}
            </div>

            {canDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss?.(toast.id)}
                aria-label="Dismiss toast"
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700",
                  classNames?.close,
                )}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </motion.li>
  );
});
