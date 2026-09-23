import type { Metadata } from "next";
import "../panel.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · SubscribAI Panel" },
  robots: { index: false, follow: false },
};

/**
 * Outermost /panel layout.
 *
 * It holds only the things every panel route needs, signed in or not: the
 * stylesheet, the theme bootstrap, and the `.panel-scope` wrapper that carries
 * the panel's surface tokens and the scoped reset. The sign-in page renders
 * inside this too, which is why the session check isn't here — it's in
 * (dash)/layout.tsx, one level down.
 *
 * `robots: noindex` because a customer dashboard has nothing to offer a search
 * engine, and the sign-in page would otherwise be indexable.
 */
export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-scope min-h-dvh">
      {/*
        Applies the stored theme before first paint. Without this the page
        renders light and then flips, which is worse than no dark mode at all.
        Kept inline and tiny for that reason — it has to run before the body
        is painted, so it can't be a module.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("panel-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
        }}
      />
      {children}
    </div>
  );
}
