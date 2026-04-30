"use client";

import { useEffect } from "react";

export default function PageProgress() {
  useEffect(() => {
    const bar = document.createElement("div");
    bar.className = "page-progress";
    bar.style.width = "4%";
    document.body.appendChild(bar);
    let progress = 4;
    const tick = window.setInterval(() => {
      progress = Math.min(progress + Math.random() * 9 + 2, 82);
      bar.style.width = progress + "%";
    }, 140);
    const finish = () => {
      clearInterval(tick);
      bar.style.width = "100%";
      window.setTimeout(() => bar.classList.add("is-done"), 180);
      window.setTimeout(() => bar.remove(), 600);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => { clearInterval(tick); bar.remove(); };
  }, []);
  return null;
}
