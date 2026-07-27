"use client";

import { useEffect, useState } from "react";

const KEY = "subscribai-favorites";

function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Plati-style bookmark ribbon on the product box. Persists per-browser. */
export default function FavoriteButton({ productId }: { productId: string }) {
  const [fav, setFav] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFav(readFavs().includes(productId));
  }, [productId]);

  const toggle = () => {
    const favs = readFavs();
    const next = favs.includes(productId)
      ? favs.filter((id) => id !== productId)
      : [...favs, productId];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setFav(next.includes(productId));
  };

  return (
    <button
      type="button"
      className={`pl-fav-btn ${mounted && fav ? "is-fav" : ""}`}
      onClick={toggle}
      aria-pressed={fav}
      aria-label={fav ? "Remove from saved" : "Save for later"}
      title={fav ? "Remove from saved" : "Save for later"}
    >
      <i className={`${mounted && fav ? "fa-solid" : "fa-regular"} fa-bookmark`}></i>
    </button>
  );
}
