"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TestResult = { ok: boolean; status?: number; error?: string; data?: any };
type Diagnostics = {
  config: {
    supabase: {
      url: { set: boolean; value: string | null };
      anon: { set: boolean; len: number; head: string };
      service: { set: boolean; len: number; head: string };
    };
    cloudinary: {
      cloudName: { set: boolean; value: string | null };
      apiKey: { set: boolean; len: number; head: string };
      apiSecret: { set: boolean; len: number; head: string };
    };
  };
  tests: Record<string, TestResult>;
  timestamp: string;
};

const TEST_LABELS: Record<string, string> = {
  supabaseAuth: "Supabase Auth API reachable",
  supabaseServiceRole: "Service-role key authorised",
  schemaProducts: "`products` table exists",
  schemaAdmins: "`admins` table exists",
  cloudinary: "Cloudinary cloud_name resolves",
};

export default function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/diagnostics", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setErr(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(); }, []);

  function StatusDot({ ok }: { ok: boolean }) {
    return (
      <span
        style={{
          display: "inline-block", width: 10, height: 10, borderRadius: 999,
          background: ok ? "#22c55e" : "#F54848",
          boxShadow: `0 0 0 3px ${ok ? "rgba(34,197,94,0.20)" : "rgba(245,72,72,0.20)"}`,
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: "32px 18px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              <Link href="/admin/login" style={{ color: "var(--text-muted)" }}>← Back to login</Link>
            </p>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--text)", margin: "6px 0 0", letterSpacing: "-0.02em" }}>
              Admin diagnostics
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: 4 }}>
              Live connectivity check for Supabase + Cloudinary.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={run}
            disabled={loading}
          >
            <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-rotate"}`}></i>
            {loading ? "Checking…" : "Re-run"}
          </button>
        </div>

        {err && (
          <div className="admin-card" style={{ background: "rgba(245,72,72,0.10)", borderColor: "rgba(245,72,72,0.30)", color: "#fca5a5", marginBottom: 14 }}>
            {err}
          </div>
        )}

        {data && (
          <>
            {/* Live tests */}
            <div className="admin-card">
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 14px" }}>
                Live tests
              </h2>
              <div style={{ display: "grid", gap: 10 }}>
                {Object.entries(data.tests).map(([key, t]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 12px", borderRadius: 10,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <StatusDot ok={t.ok} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--text)", fontWeight: 500, fontSize: "0.92rem" }}>
                        {TEST_LABELS[key] || key}
                      </div>
                      {!t.ok && t.error && (
                        <div style={{ color: "#fca5a5", fontSize: "0.82rem", marginTop: 2, wordBreak: "break-word" }}>
                          {t.error}
                        </div>
                      )}
                      {t.ok && t.data && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 2 }}>
                          {Object.entries(t.data).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </div>
                      )}
                    </div>
                    {typeof t.status === "number" && (
                      <code style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>HTTP {t.status}</code>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Config snapshot */}
            <div className="admin-card" style={{ marginTop: 14 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 14px" }}>
                Environment variables
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", marginTop: 0 }}>
                Only key prefixes and lengths are shown — full values stay on the server.
              </p>

              <h3 style={{ fontSize: "0.85rem", color: "var(--text-soft)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "14px 0 6px" }}>
                Supabase
              </h3>
              <ConfigRow label="NEXT_PUBLIC_SUPABASE_URL" set={data.config.supabase.url.set} value={data.config.supabase.url.value} />
              <ConfigRow label="NEXT_PUBLIC_SUPABASE_ANON_KEY" set={data.config.supabase.anon.set} value={data.config.supabase.anon.set ? `${data.config.supabase.anon.head} (${data.config.supabase.anon.len} chars)` : null} />
              <ConfigRow label="SUPABASE_SERVICE_ROLE_KEY" set={data.config.supabase.service.set} value={data.config.supabase.service.set ? `${data.config.supabase.service.head} (${data.config.supabase.service.len} chars)` : null} />

              <h3 style={{ fontSize: "0.85rem", color: "var(--text-soft)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "14px 0 6px" }}>
                Cloudinary
              </h3>
              <ConfigRow label="NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" set={data.config.cloudinary.cloudName.set} value={data.config.cloudinary.cloudName.value} />
              <ConfigRow label="CLOUDINARY_API_KEY" set={data.config.cloudinary.apiKey.set} value={data.config.cloudinary.apiKey.set ? `${data.config.cloudinary.apiKey.head} (${data.config.cloudinary.apiKey.len} chars)` : null} />
              <ConfigRow label="CLOUDINARY_API_SECRET" set={data.config.cloudinary.apiSecret.set} value={data.config.cloudinary.apiSecret.set ? `set (${data.config.cloudinary.apiSecret.len} chars)` : null} />
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 14, textAlign: "center" }}>
              Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigRow({ label, set, value }: { label: string; set: boolean; value: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", gap: 12 }}>
      <code style={{ fontSize: "0.82rem", color: set ? "var(--text-soft)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
        {label}
      </code>
      <span style={{ fontSize: "0.82rem", color: set ? "var(--text)" : "#fca5a5", textAlign: "right", flexShrink: 0 }}>
        {set ? value : "not set"}
      </span>
    </div>
  );
}
