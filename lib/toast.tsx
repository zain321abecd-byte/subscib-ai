"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastKind = "success" | "info" | "warning" | "danger";
type ToastItem = { id: number; kind: ToastKind; title: string; msg?: string };

type ToastCtx = {
  toast: (kind: ToastKind, title: string, msg?: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastKind, string> = {
  success: "fa-circle-check",
  info: "fa-circle-info",
  warning: "fa-triangle-exclamation",
  danger: "fa-circle-xmark",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((kind: ToastKind, title: string, msg?: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, title, msg }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast is-${t.kind}`}>
            <span className="toast-icon" style={{ color: `var(--${t.kind}-500)` }}>
              <i className={`fa-solid ${ICONS[t.kind]}`}></i>
            </span>
            <div>
              <div className="toast-title">{t.title}</div>
              {t.msg && <div className="toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
