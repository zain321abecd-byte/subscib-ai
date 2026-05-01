"use client";

import { useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  /** Hard cap (default 4). The cover image lives in a separate field. */
  max?: number;
};

// Multi-image gallery picker. Click "+ Add" or drop files onto the grid.
// Re-order via drag (left/right). Remove via the × button on each tile.
export default function MultiImagePicker({ value, onChange, folder = "uploads", max = 4 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const remaining = Math.max(0, max - value.length);

  function pickFile() {
    if (busy || remaining === 0) return;
    inputRef.current?.click();
  }

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Upload failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.url as string;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const slots = Math.min(arr.length, remaining);
    if (slots === 0) {
      setError(`Maximum ${max} images.`);
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(8);

    const trickle = window.setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.max(1, (85 - p) / 8) : p));
    }, 220);

    const out: string[] = [];
    try {
      for (let i = 0; i < slots; i++) {
        out.push(await uploadOne(arr[i]));
        setProgress(8 + ((i + 1) / slots) * 78);
      }
      onChange([...value, ...out]);
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
      if (out.length > 0) onChange([...value, ...out]);
    } finally {
      window.clearInterval(trickle);
      window.setTimeout(() => {
        setBusy(false);
        setProgress(0);
      }, 250);
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className={`admin-multi-picker ${dragOver ? "is-drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy && remaining > 0) setDragOver(true);
      }}
      onDragLeave={(e) => {
        // Only end drag if we actually left the picker (not a child).
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="admin-multi-drop-overlay" aria-hidden>
          <i className="fa-solid fa-cloud-arrow-up"></i>
          <strong>Drop {remaining > 1 ? `up to ${remaining} images` : "image"} to upload</strong>
        </div>
      )}
      <div className="admin-multi-grid">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="admin-multi-tile"
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragIndex != null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Image ${i + 1}`} />
            <button
              type="button"
              className="admin-multi-tile-remove"
              onClick={() => removeAt(i)}
              aria-label={`Remove image ${i + 1}`}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <span className="admin-multi-tile-index">{i + 1}</span>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            className={`admin-multi-add ${busy ? "is-busy" : ""}`}
            onClick={pickFile}
            disabled={busy}
            aria-label="Add image"
          >
            {busy ? (
              <>
                <span className="admin-spinner" />
                <small style={{ marginTop: 6 }}>Uploading…</small>
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus"></i>
                <small>Add image</small>
              </>
            )}
          </button>
        )}
      </div>

      {busy && (
        <div className="admin-image-progress" style={{ marginTop: 8 }}>
          <div className="admin-image-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      <p className="admin-help">
        <i className="fa-solid fa-circle-info" style={{ marginRight: 6, opacity: 0.6 }}></i>
        Click <strong>+</strong> to pick <strong>multiple files at once</strong>, or drag &amp; drop them here.
        Drag tiles to reorder. Up to {max} images.
      </p>

      {error && <div className="admin-image-error">{error}</div>}
    </div>
  );
}
