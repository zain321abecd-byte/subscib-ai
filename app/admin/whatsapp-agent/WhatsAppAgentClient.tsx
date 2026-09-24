"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAgentStatus,
  startAgent,
  stopAgent,
  getAgentHistory,
  type AgentStatus,
  type ConversationTurn,
} from "./actions";

// ── Styles ───────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--card, #1a1a2e)",
  borderRadius: 12,
  padding: "20px 24px",
  border: "1px solid var(--border, #ffffff12)",
};

const badge = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  background: active ? "#10b98120" : "#ef444420",
  color: active ? "#10b981" : "#ef4444",
});

const dot = (active: boolean): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: active ? "#10b981" : "#ef4444",
  animation: active ? "pulse 2s infinite" : "none",
});

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const msgBubble = (isUser: boolean): React.CSSProperties => ({
  maxWidth: "80%",
  padding: "10px 14px",
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.5,
  background: isUser ? "#25D366" : "var(--card, #1a1a2e)",
  color: isUser ? "#fff" : "var(--foreground, #e0e0e0)",
  alignSelf: isUser ? "flex-end" : "flex-start",
  border: isUser ? "none" : "1px solid var(--border, #ffffff12)",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
});

export default function WhatsAppAgentClient() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [history, setHistory] = useState<Record<string, ConversationTurn[]>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await getAgentStatus();
    if (res.ok && res.data) setStatus(res.data);
    else setError(res.ok ? "" : res.error);
  }, []);

  const fetchHistory = useCallback(async () => {
    const res = await getAgentHistory();
    if (res.ok && res.data) {
      setHistory(res.data);
      // Auto-select first phone if none selected
      if (!selectedPhone) {
        const phones = Object.keys(res.data);
        if (phones.length > 0) setSelectedPhone(phones[0]);
      }
    }
  }, [selectedPhone]);

  // Initial load + polling
  useEffect(() => {
    (async () => {
      await Promise.all([fetchStatus(), fetchHistory()]);
      setLoading(false);
    })();
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchHistory();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle() {
    if (!status) return;
    setToggling(true);
    setError("");
    const res = status.workerRunning ? await stopAgent() : await startAgent();
    if (!res.ok) setError(res.error);
    await fetchStatus();
    setToggling(false);
  }

  const phones = Object.keys(history);
  const turns = selectedPhone ? history[selectedPhone] ?? [] : [];

  if (loading) {
    return (
      <div style={{ padding: "24px 28px", color: "var(--muted, #888)" }}>
        Loading WhatsApp AI Agent…
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            <i className="fa-brands fa-whatsapp" style={{ color: "#25D366", marginRight: 8 }} />
            WhatsApp AI Agent
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted, #888)" }}>
            Automated AI-powered customer support on WhatsApp
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={badge(status?.workerRunning ?? false)}>
            <span style={dot(status?.workerRunning ?? false)} />
            {status?.workerRunning ? "Running" : "Stopped"}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ ...card, background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444", fontSize: 14 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
          {error}
        </div>
      )}

      {/* Status + Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Configuration
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {status?.configured ? (
              <span style={{ color: "#10b981" }}><i className="fa-solid fa-check-circle" /> Configured</span>
            ) : (
              <span style={{ color: "#f59e0b" }}><i className="fa-solid fa-triangle-exclamation" /> Not configured</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 4 }}>
            {status?.configured ? "WHATSAPP_AGENT_KEY is set" : "Set WHATSAPP_AGENT_KEY in env"}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Conversations
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{phones.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 4 }}>
            Active chat{phones.length !== 1 ? "s" : ""} in memory
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Agent Control
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling || !status?.configured}
            style={{
              ...btnPrimary,
              background: status?.workerRunning ? "#ef4444" : "#10b981",
              color: "#fff",
              opacity: toggling || !status?.configured ? 0.5 : 1,
              width: "100%",
              marginTop: 4,
            }}
          >
            {toggling ? (
              "Updating…"
            ) : status?.workerRunning ? (
              <><i className="fa-solid fa-stop" style={{ marginRight: 6 }} /> Stop Agent</>
            ) : (
              <><i className="fa-solid fa-play" style={{ marginRight: 6 }} /> Start Agent</>
            )}
          </button>
        </div>
      </div>

      {/* Conversation History */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            <i className="fa-solid fa-comments" style={{ marginRight: 8, color: "#25D366" }} />
            Conversations
          </h2>
          {phones.length > 0 && (
            <select
              value={selectedPhone ?? ""}
              onChange={(e) => setSelectedPhone(e.target.value)}
              style={{
                background: "var(--input, #0f0f23)",
                color: "var(--foreground, #e0e0e0)",
                border: "1px solid var(--border, #ffffff12)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              {phones.map((p) => (
                <option key={p} value={p}>
                  {p} ({(history[p] ?? []).length} messages)
                </option>
              ))}
            </select>
          )}
        </div>

        {phones.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted, #888)", fontSize: 14 }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.4 }} />
            No conversations yet. Start the agent and send a WhatsApp message to begin.
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 500,
            overflowY: "auto",
            padding: "12px 0",
          }}>
            {turns.map((turn, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                <div style={msgBubble(turn.role === "user")}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
                    {turn.role === "user" ? (
                      <><i className="fa-solid fa-user" style={{ marginRight: 4 }} /> Customer</>
                    ) : (
                      <><i className="fa-solid fa-robot" style={{ marginRight: 4 }} /> AI Agent</>
                    )}
                  </div>
                  {turn.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
