"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Toaster } from "@once-ui-system/core";

type ToastType = "success" | "error" | "info";
type Variant = "success" | "danger" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: Variant;
  message: ReactNode;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const VARIANT: Record<ToastType, Variant> = {
  success: "success",
  error: "danger",
  info: "info",
};

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = String(nextId++);
      setToasts((t) => [...t, { id, variant: VARIANT[type], message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} xl="top" l="top" m="top" s="top" xs="top" />
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}
