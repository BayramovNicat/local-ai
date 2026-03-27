"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  error: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, error, success }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    error: <AlertCircle className="text-red-400" size={18} />,
    success: <CheckCircle className="text-green-400" size={18} />,
    info: <Info className="text-blue-400" size={18} />,
  };

  const bgColors = {
    error: "bg-red-950/20 border-red-500/30",
    success: "bg-green-950/20 border-green-500/30",
    info: "bg-blue-950/20 border-blue-500/30",
  };

  return (
    <div
      className={`animate-in slide-in-from-right-full pointer-events-auto flex max-w-md min-w-[280px] items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md duration-300 ${bgColors[toast.type]}`}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium text-neutral-200">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
