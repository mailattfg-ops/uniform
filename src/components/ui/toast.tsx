"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
  type AnimatedToast,
  type ToastInput,
  type ToastPosition,
} from "@/components/motion/animated-toast-stack";

interface ToastContextType {
  toasts: AnimatedToast[];
  showToast: (input: ToastInput) => string;
  updateToast: (id: string, patch: Partial<ToastInput>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global listener pattern to support calling `toast.success(...)` from anywhere (even outside component tree)
type ToastListener = {
  show: (input: ToastInput) => string;
  update: (id: string, patch: Partial<ToastInput>) => void;
  dismiss: (id?: string) => void;
  clear: () => void;
};

let globalListener: ToastListener | null = null;

function normalizeInput(messageOrInput: ReactNode | ToastInput, options?: Partial<ToastInput>): ToastInput {
  if (typeof messageOrInput === "object" && messageOrInput !== null && !React.isValidElement(messageOrInput) && "title" in messageOrInput) {
    return { ...(messageOrInput as ToastInput), ...options };
  }
  return {
    title: messageOrInput as ReactNode,
    ...options,
  };
}

export function toast(messageOrInput: ReactNode | ToastInput, options?: Partial<ToastInput>): string {
  const input = normalizeInput(messageOrInput, options);
  if (globalListener) {
    return globalListener.show(input);
  }
  return "";
}

toast.success = (message: ReactNode, options?: Partial<ToastInput>) => {
  return toast(message, { status: "success", ...options });
};

toast.error = (message: ReactNode, options?: Partial<ToastInput>) => {
  return toast(message, { status: "error", ...options });
};

toast.info = (message: ReactNode, options?: Partial<ToastInput>) => {
  return toast(message, { status: "info", ...options });
};

toast.loading = (message: ReactNode, options?: Partial<ToastInput>) => {
  return toast(message, { status: "loading", duration: 0, ...options });
};

toast.dismiss = (id?: string) => {
  if (globalListener) {
    globalListener.dismiss(id);
  }
};

toast.clear = () => {
  if (globalListener) {
    globalListener.clear();
  }
};

toast.promise = async <T,>(
  promise: Promise<T>,
  msgs: {
    loading: ReactNode;
    success: ReactNode | ((data: T) => ReactNode);
    error: ReactNode | ((err: any) => ReactNode);
  }
): Promise<T> => {
  const id = toast.loading(msgs.loading);
  try {
    const data = await promise;
    const successMsg = typeof msgs.success === "function" ? msgs.success(data) : msgs.success;
    if (globalListener) {
      globalListener.update(id, {
        status: "success",
        title: successMsg,
        duration: 3500,
      });
    }
    return data;
  } catch (err) {
    const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
    if (globalListener) {
      globalListener.update(id, {
        status: "error",
        title: errorMsg,
        duration: 4500,
      });
    }
    throw err;
  }
};

export default toast;

export interface AnimatedToastProviderProps {
  children?: ReactNode;
  position?: ToastPosition;
  defaultDuration?: number;
  maxVisible?: number;
}

export function AnimatedToastProvider({
  children,
  position = "bottom-right",
  defaultDuration = 3800,
  maxVisible = 5,
}: AnimatedToastProviderProps) {
  const {
    toasts,
    showToast,
    updateToast,
    dismissToast,
    clearToasts,
  } = useAnimatedToastStack({
    defaultDuration,
    limit: maxVisible + 3,
  });

  useEffect(() => {
    globalListener = {
      show: showToast,
      update: updateToast,
      dismiss: (id) => (id ? dismissToast(id) : clearToasts()),
      clear: clearToasts,
    };
    return () => {
      globalListener = null;
    };
  }, [showToast, updateToast, dismissToast, clearToasts]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        updateToast,
        dismissToast,
        clearToasts,
      }}
    >
      {children}
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position={position}
        placement="fixed"
        maxVisible={maxVisible}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    toast,
    toasts: ctx?.toasts || [],
    dismiss: ctx?.dismissToast || toast.dismiss,
    clear: ctx?.clearToasts || toast.clear,
  };
}
