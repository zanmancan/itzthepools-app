"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; message: string; type?: "success" | "error" };
type Ctx = { addToast: (msg: string, type?: Toast["type"]) => void };

const ToastCtx = createContext<Ctx | null>(null);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type?: Toast["type"]) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg ${
              t.type === "error" ? "bg-red-600/90" : "bg-emerald-600/90"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
