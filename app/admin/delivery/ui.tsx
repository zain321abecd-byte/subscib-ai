"use client";

/**
 * Small UI primitives shared by the three delivery screens (composer,
 * templates, history). Deliberately the same look as the Daily Sales screen —
 * modal shell, styled dropdown, stat cards, table cells — so the section
 * doesn't feel bolted on.
 */

import { useEffect, useRef, useState } from "react";
import type { MessageStatus } from "@/lib/delivery";

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", color: "var(--text-muted)" }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

export function FieldRow({ children, min = 180 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}

export function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 700, textAlign: "left", ...style }}>
      {children}
    </th>
  );
}

export function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px 14px", verticalAlign: "top", ...style }}>{children}</td>;
}

export function flashStyle(kind: "ok" | "err" | "warn"): React.CSSProperties {
  const tone = {
    ok:   { bg: "rgba(34,197,94,0.12)",  fg: "#22c55e", br: "rgba(34,197,94,0.35)" },
    err:  { bg: "rgba(245,72,72,0.12)",  fg: "#F54848", br: "rgba(245,72,72,0.35)" },
    warn: { bg: "rgba(245,150,34,0.12)", fg: "#F59622", br: "rgba(245,150,34,0.35)" },
  }[kind];
  return {
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: "0.9rem",
    background: tone.bg,
    color: tone.fg,
    border: `1px solid ${tone.br}`,
  };
}

export const footerCancelStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "0.82rem",
  letterSpacing: "0.08em",
  fontWeight: 700,
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "10px 16px",
};

export function footerPrimaryStyle(enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? "#4884FF" : "var(--surface-2, rgba(255,255,255,0.06))",
    color: enabled ? "#fff" : "var(--text-muted)",
    border: "none",
    borderRadius: 6,
    fontSize: "0.82rem",
    letterSpacing: "0.08em",
    fontWeight: 700,
    padding: "10px 18px",
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

export function IconBtn({
  icon, title, onClick, color, disabled,
}: { icon: string; title: string; onClick: () => void; color?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 6,
        display: "grid", placeItems: "center",
        background: "transparent",
        border: "1px solid var(--border)",
        color: disabled ? "var(--text-muted)" : color || "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <i className={icon.startsWith("fa-brands") ? icon : `fa-solid ${icon}`} />
    </button>
  );
}

export function StatCard({
  icon, label, value, tone,
}: { icon: string; label: string; value: number | string; tone: "ok" | "warn" | "danger" | "brand" }) {
  const colors = {
    ok:     { bg: "rgba(34,197,94,0.10)",  fg: "#22c55e" },
    warn:   { bg: "rgba(245,150,34,0.10)", fg: "#F59622" },
    danger: { bg: "rgba(245,72,72,0.10)",  fg: "#F54848" },
    brand:  { bg: "rgba(72,132,255,0.12)", fg: "#4884FF" },
  }[tone];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, color: colors.fg, display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{value}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: MessageStatus }) {
  const map: Record<MessageStatus, { bg: string; fg: string; label: string }> = {
    sent:    { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e", label: "SENT" },
    pending: { bg: "rgba(245,150,34,0.15)", fg: "#F59622", label: "PENDING" },
    failed:  { bg: "rgba(245,72,72,0.15)",  fg: "#F54848", label: "FAILED" },
  };
  const tone = map[status] ?? map.pending;
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em" }}>
      {tone.label}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "ok" }) {
  const colors = {
    neutral: { bg: "var(--surface-2, rgba(255,255,255,0.06))", fg: "var(--text-muted)" },
    brand:   { bg: "rgba(72,132,255,0.15)", fg: "#4884FF" },
    ok:      { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
  }[tone];
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: colors.bg, color: colors.fg, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

export function ModalShell({
  title, children, onClose, footer, size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const maxWidth = size === "sm" ? 480 : size === "lg" ? 820 : 640;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)",
          maxWidth, width: "100%", maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-scroll" style={{ flex: 1, overflowY: "auto", padding: 22 }}>{children}</div>
        {footer && (
          <div style={{ padding: "12px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "var(--surface)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title, message, onCancel, onConfirm, confirmLabel = "Confirm", danger = true,
}: {
  title: string;
  message: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell
      title={title}
      onClose={busy ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} style={footerCancelStyle}>CANCEL</button>
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            disabled={busy}
            style={{ ...footerPrimaryStyle(true), background: danger ? "#F54848" : "#4884FF" }}
          >
            {busy ? "WORKING…" : confirmLabel.toUpperCase()}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: danger ? "rgba(245,72,72,0.12)" : "rgba(72,132,255,0.12)", color: danger ? "#F54848" : "#4884FF" }}>
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <div style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.5 }}>{message}</div>
      </div>
    </ModalShell>
  );
}

/** Themed dropdown replacing the native <select>. */
export function StyledSelect({
  value, onChange, placeholder, options, icon, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  icon?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="admin-input"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
        }}
      >
        {icon && <i className={`fa-solid ${icon}`} style={{ color: "var(--text-muted)", fontSize: 12 }} />}
        <span style={{ flex: 1, color: selected ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label || placeholder}
        </span>
        <i className="fa-solid fa-chevron-down" style={{ color: "var(--text-muted)", fontSize: 11 }} />
      </button>

      {open && (
        <div
          role="listbox"
          className="admin-scroll"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)", maxHeight: 280, overflowY: "auto", padding: 4,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Nothing to pick yet.</div>
          )}
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 7,
                  border: "none", cursor: "pointer", fontSize: "0.88rem",
                  background: active ? "rgba(72,132,255,0.14)" : "transparent",
                  color: active ? "#4884FF" : "var(--text)",
                  display: "grid", gap: 2,
                }}
              >
                <span>{o.label}</span>
                {o.hint && <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{o.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Copy-to-clipboard button with a short "Copied" confirmation. */
export function CopyButton({
  text, label = "Copy message", compact,
}: { text: string; label?: string; compact?: boolean }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* nothing else to try */ }
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  if (compact) {
    return <IconBtn icon={done ? "fa-check" : "fa-copy"} title={label} onClick={copy} color={done ? "#22c55e" : undefined} />;
  }
  return (
    <button type="button" className="admin-btn admin-btn-ghost" onClick={copy}>
      <i className={`fa-solid ${done ? "fa-check" : "fa-copy"}`} style={{ marginRight: 6 }} />
      {done ? "Copied" : label}
    </button>
  );
}
