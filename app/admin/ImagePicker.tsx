"use client";

import { useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
};

// Click anywhere on the preview area to choose a file. While uploading, a
// translucent overlay with a spinner + progress bar covers the area.
export default function ImagePicker({ value, onChange, folder = "uploads" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(8);

    const trickle = window.setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.max(1, (85 - p) / 8) : p));
    }, 220);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Upload failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      setProgress(100);
      onChange(data.url);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      window.clearInterval(trickle);
      // Brief pause so the user actually sees "100%" before the overlay clears.
      window.setTimeout(() => {
        setBusy(false);
        setProgress(0);
      }, 250);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div className="admin-image-picker-v2">
      <button
        type="button"
        className={`admin-image-dropzone ${dragOver ? "is-drag" : ""} ${busy ? "is-busy" : ""} ${value ? "has-image" : ""}`}
        onClick={pickFile}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label={value ? "Change image" : "Upload image"}
        disabled={busy}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="preview" className="admin-image-dropzone-img" />
        ) : (
          <div className="admin-image-dropzone-empty">
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <strong>Click or drag &amp; drop an image</strong>
            <small>PNG, JPG, or WebP — up to ~10 MB</small>
          </div>
        )}

        {busy && (
          <div className="admin-image-dropzone-overlay" aria-busy="true">
            <span className="admin-spinner lg" />
            <p>Uploading…</p>
            <div className="admin-image-progress">
              <div className="admin-image-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {value && !busy && (
          <span className="admin-image-dropzone-hint">
            <i className="fa-solid fa-pen"></i> Click to replace
          </span>
        )}
      </button>

      {value && !busy && (
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          style={{ alignSelf: "flex-start" }}
        >
          <i className="fa-solid fa-trash"></i> Remove image
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      <details className="admin-image-paste">
        <summary>Or paste an image URL</summary>
        <input
          type="url"
          className="admin-input"
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          style={{ marginTop: 8 }}
        />
      </details>

      {error && <div className="admin-image-error">{error}</div>}
    </div>
  );
}
