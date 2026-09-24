"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAgentStatus,
  saveAgentKeys,
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--input, #0f0f23)",
  color: "var(--foreground, #e0e0e0)",
  border: "1px solid var(--border, #ffffff20)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
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
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  // Key configuration state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [whatsappKeyInput, setWhatsappKeyInput] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [showWhatsappKey, setShowWhatsappKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await getAgentStatus();
    if (res.ok && res.data) {
      setStatus(res.data);
      // If not configured yet, automatically open config panel
      if (!res.data.configured) {
        setShowConfigPanel(true);
      }
    } else {
      setError(res.ok ? "" : res.error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const res = await getAgentHistory();
    if (res.ok && res.data) {
      setHistory(res.data);
      if (!selectedPhone) {
        const phones = Object.keys(res.data);
        if (phones.length > 0) setSelectedPhone(phones[0]);
      }
    }
  }, [selectedPhone]);

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
    setSuccessMsg("");
    const res = status.workerRunning ? await stopAgent() : await startAgent();
    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccessMsg(status.workerRunning ? "Agent stopped." : "Agent started successfully!");
    }
    await fetchStatus();
    setToggling(false);
  }

  async function handleSaveKeys(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappKeyInput && !geminiKeyInput && !status?.hasWhatsappKey) {
      setError("Please enter a WhatsApp Agent API Key.");
      return;
    }

    setSavingKeys(true);
    setError("");
    setSuccessMsg("");

    const payload: { whatsappAgentKey?: string; geminiApiKey?: string } = {};
    if (whatsappKeyInput.trim()) payload.whatsappAgentKey = whatsappKeyInput.trim();
    if (geminiKeyInput.trim()) payload.geminiApiKey = geminiKeyInput.trim();

    const res = await saveAgentKeys(payload);
    setSavingKeys(false);

    if (res.ok && res.data) {
      setStatus(res.data);
      setWhatsappKeyInput("");
      setGeminiKeyInput("");
      setSuccessMsg("API Keys saved successfully! Agent is now configured.");
      if (res.data.configured) {
        setShowConfigPanel(false);
      }
    } else {
      setError(res.error || "Failed to save API keys.");
    }
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
          <button
            onClick={() => setShowConfigPanel((prev) => !prev)}
            style={{
              padding: "8px 14px",
              background: "var(--card, #1a1a2e)",
              color: "var(--foreground, #e0e0e0)",
              border: "1px solid var(--border, #ffffff20)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 500,
            }}
          >
            <i className="fa-solid fa-key" style={{ color: "#f59e0b" }} />
            {showConfigPanel ? "Close Key Settings" : "Configure Keys"}
          </button>
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

      {successMsg && (
        <div style={{ ...card, background: "#10b98115", border: "1px solid #10b98140", color: "#10b981", fontSize: 14 }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
          {successMsg}
        </div>
      )}

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted, #888)", textTransform: "uppercase", letterSpacing: 1 }}>
              Configuration
            </span>
            <button
              onClick={() => setShowConfigPanel(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "#3b82f6",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {status?.configured ? "Edit Key" : "Add Key"}
            </button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {status?.configured ? (
              <span style={{ color: "#10b981" }}><i className="fa-solid fa-check-circle" /> Configured</span>
            ) : (
              <span style={{ color: "#f59e0b" }}><i className="fa-solid fa-triangle-exclamation" /> Not configured</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            <div>
              WA Key:{" "}
              {status?.hasWhatsappKey ? (
                <span style={{ color: "#10b981", fontFamily: "monospace" }}>{status.maskedWhatsappKey || "Set"}</span>
              ) : (
                <span style={{ color: "#ef4444" }}>Missing</span>
              )}
            </div>
            <div>
              Gemini AI:{" "}
              {status?.hasGeminiKey ? (
                <span style={{ color: "#10b981", fontFamily: "monospace" }}>{status.maskedGeminiKey || "Set"}</span>
              ) : (
                <span style={{ color: "var(--muted, #888)" }}>Optional (or via env)</span>
              )}
            </div>
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
          {!status?.configured && (
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, textAlign: "center" }}>
              Add your WhatsApp Agent Key below to enable
            </div>
          )}
        </div>
      </div>

      {/* Key Configuration Form Panel */}
      {showConfigPanel && (
        <div style={{ ...card, border: "1px solid #3b82f640", background: "var(--card, #16162a)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-key" style={{ color: "#f59e0b" }} />
                Agent API Credentials
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #888)" }}>
                Add your keys here. They are securely encrypted and saved to the database.
              </p>
            </div>
            {status?.configured && (
              <button
                type="button"
                onClick={() => setShowConfigPanel(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted, #888)",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <form onSubmit={handleSaveKeys} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* WhatsApp Agent Key */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  WhatsApp Agent API Key <span style={{ color: "#ef4444" }}>*</span>
                </label>
                {status?.hasWhatsappKey && (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 500 }}>
                    <i className="fa-solid fa-check" style={{ marginRight: 4 }} />
                    Active ({status.maskedWhatsappKey})
                  </span>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showWhatsappKey ? "text" : "password"}
                  value={whatsappKeyInput}
                  onChange={(e) => setWhatsappKeyInput(e.target.value)}
                  placeholder={status?.hasWhatsappKey ? "Leave blank to keep current key, or paste new key" : "Paste your WhatsApp Agent key"}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowWhatsappKey((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--muted, #888)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <i className={showWhatsappKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 4 }}>
                From WhatsApp &gt; Settings &gt; Agents &gt; your agent key.
              </div>
            </div>

            {/* Gemini API Key */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Gemini API Key <span style={{ color: "var(--muted, #888)", fontWeight: 400 }}>(for AI responses)</span>
                </label>
                {status?.hasGeminiKey && (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 500 }}>
                    <i className="fa-solid fa-check" style={{ marginRight: 4 }} />
                    Active ({status.maskedGeminiKey})
                  </span>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder={status?.hasGeminiKey ? "Leave blank to keep current key, or paste new key" : "Paste your Gemini API key (optional if set in env)"}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--muted, #888)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <i className={showGeminiKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 4 }}>
                Get a free key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                >
                  Google AI Studio
                </a>
                .
              </div>
            </div>

            {/* Submit & Cancel */}
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button
                type="submit"
                disabled={savingKeys || (!whatsappKeyInput.trim() && !geminiKeyInput.trim())}
                style={{
                  ...btnPrimary,
                  background: "#25D366",
                  color: "#000",
                  fontWeight: 700,
                  opacity: savingKeys || (!whatsappKeyInput.trim() && !geminiKeyInput.trim()) ? 0.5 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {savingKeys ? (
                  <>Saving…</>
                ) : (
                  <>
                    <i className="fa-solid fa-save" /> Save Credentials
                  </>
                )}
              </button>
              {status?.configured && (
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #ffffff20)",
                    background: "transparent",
                    color: "var(--foreground, #e0e0e0)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

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
