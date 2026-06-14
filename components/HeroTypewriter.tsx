"use client";

import { useFx } from "@/lib/fx";
import Typewriter from "@/components/Typewriter";

export default function HeroTypewriter({ isPK }: { isPK: boolean }) {
  const { currency } = useFx();

  const phrases = isPK
    ? [
        "ready in 30 min.",
        `billed in ${currency}.`,
        "backed by humans.",
        "without the forex.",
      ]
    : [
        "ready in 30 min.",
        `billed in ${currency}.`,
        "backed by humans.",
        "no surprises.",
      ];

  return <Typewriter phrases={phrases} typingMs={75} holdMs={2000} fadeMs={420} />;
}
