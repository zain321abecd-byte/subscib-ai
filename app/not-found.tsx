import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import NotFoundPanel from "@/components/NotFoundPanel";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page doesn't exist. Browse premium AI subscriptions, pricing bundles, or contact SubscribAI support.",
  robots: { index: false, follow: true },
};

/**
 * 404 for URLs that match no route.
 *
 * This boundary renders inside app/layout.tsx only — the public layout (and
 * with it Header/Footer plus the cart / auth / currency providers) never
 * mounts here, so the page carries its own minimal branded bar instead of
 * pulling client context it can't provide.
 */
export default function NotFound() {
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-4) var(--space-5)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" aria-label="SubscribAI home" style={{ display: "inline-flex" }}>
          <Image
            src="/assets/subscribai-logo.png"
            alt="SubscribAI"
            width={140}
            height={36}
            priority
            style={{ height: 32, width: "auto" }}
          />
        </Link>
        <Link href="/shop" className="btn btn-outline btn-small">
          Shop
        </Link>
      </header>

      <main>
        <NotFoundPanel />
      </main>
    </>
  );
}
