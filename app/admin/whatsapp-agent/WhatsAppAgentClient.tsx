"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAgentStatus,
  listAgents,
  saveAgent,
  deleteAgent,
  startAgent,
  stopAgent,
  getAgentHistory,
  type AgentRuntimeStatus,
  type AgentStatusSummary,
  type ConversationTurn,
  type SaveAgentInput,
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
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  transition: "opacity 0.15s",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
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
  const [summary, setSummary] = useState<AgentStatusSummary | null>(null);
  const [agents, setAgents] = useState<AgentRuntimeStatus[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [history, setHistory] = useState<Record<string, ConversationTurn[]>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal / Form state for Add/Edit Agent
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SaveAgentInput>({
    name: "",
    whatsappKey: "",
    geminiKey: "",
    role: "admin_assistant",
    systemPrompt: "",
    enabled: true,
  });
  const [showWaKey, setShowWaKey] = useState(false);
  const [showGemKey, setShowGemKey] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatusAndAgents = useCallback(async () => {
    const [statusRes, agentsRes] = await Promise.all([getAgentStatus(), listAgents()]);
    if (statusRes.ok && statusRes.data) {
      setSummary(statusRes.data);
    }
    if (agentsRes.ok && agentsRes.data) {
      setAgents(agentsRes.data);
      if (!selectedAgentId && agentsRes.data.length > 0) {
        setSelectedAgentId(agentsRes.data[0].id);
      }
    }
  }, [selectedAgentId]);

  const fetchHistory = useCallback(async () => {
    if (!selectedAgentId) return;
    const res = await getAgentHistory(selectedAgentId);
    if (res.ok && res.data) {
      setHistory(res.data);
      if (!selectedPhone) {
        const phones = Object.keys(res.data);
        if (phones.length > 0) setSelectedPhone(phones[0]);
      }
    }
  }, [selectedAgentId, selectedPhone]);

  useEffect(() => {
    (async () => {
      await fetchStatusAndAgents();
      setLoading(false);
    })();
    pollRef.current = setInterval(() => {
      fetchStatusAndAgents();
      fetchHistory();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedAgentId) {
      fetchHistory();
    }
  }, [selectedAgentId, fetchHistory]);

  async function handleToggleAgent(ag: AgentRuntimeStatus) {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    const res = ag.workerRunning ? await stopAgent(ag.id) : await startAgent(ag.id);
    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccessMsg(`Agent "${ag.name}" ${ag.workerRunning ? "stopped" : "started"}!`);
    }
    await fetchStatusAndAgents();
    setActionLoading(false);
  }

  async function handleDeleteAgent(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete agent "${name}"?`)) return;
    setActionLoading(true);
    setError("");
    const res = await deleteAgent(id);
    if (!res.ok) {
      setError(res.error);
    } else {
      setSuccessMsg(`Agent "${name}" deleted.`);
      if (selectedAgentId === id) {
        const remaining = agents.filter((a) => a.id !== id);
        setSelectedAgentId(remaining[0]?.id || "");
      }
    }
    await fetchStatusAndAgents();
    setActionLoading(false);
  }

  function openCreateModal() {
    setEditingAgent({
      name: "",
      whatsappKey: "",
      geminiKey: "",
      role: "admin_assistant",
      systemPrompt: "",
      enabled: true,
    });
    setShowWaKey(false);
    setShowGemKey(false);
    setModalOpen(true);
  }

  function openEditModal(ag: AgentRuntimeStatus) {
    setEditingAgent({
      id: ag.id,
      name: ag.name,
      whatsappKey: "", // Keep blank if unchanged
      geminiKey: "",
      role: ag.role,
      systemPrompt: ag.systemPrompt || "",
      enabled: ag.enabled,
    });
    setShowWaKey(false);
    setShowGemKey(false);
    setModalOpen(true);
  }

  async function handleSaveAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAgent.name.trim()) {
      setError("Please give your agent a name.");
      return;
    }
    if (!editingAgent.id && !editingAgent.whatsappKey.trim()) {
      setError("WhatsApp Agent API Key is required.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await saveAgent(editingAgent);
    setActionLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to save agent.");
      return;
    }

    setSuccessMsg(`Agent "${editingAgent.name}" saved successfully!`);
    setModalOpen(false);
    await fetchStatusAndAgents();
    if (res.data?.agent?.id) {
      setSelectedAgentId(res.data.agent.id);
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const phones = Object.keys(history);
  const turns = selectedPhone ? history[selectedPhone] ?? [] : [];

  if (loading) {
    return (
      <div style={{ padding: "24px 28px", color: "var(--muted, #888)" }}>
        Loading WhatsApp AI Assistants…
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fa-brands fa-whatsapp" style={{ color: "#25D366" }} />
            WhatsApp AI Assistants
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted, #888)" }}>
            Autonomous business agents with full database tool execution &amp; multi-agent support
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={openCreateModal}
            style={{
              ...btnPrimary,
              background: "#25D366",
              color: "#000",
              fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-plus" /> Add New Agent
          </button>
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

      {/* Agents Grid List */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted, #888)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          Configured Agents ({agents.length})
        </div>

        {agents.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <i className="fa-solid fa-robot" style={{ fontSize: 36, color: "var(--muted, #888)", marginBottom: 12, opacity: 0.5 }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>No WhatsApp Agents Added Yet</h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted, #888)", fontSize: 14 }}>
              Add your first WhatsApp agent to automate sales, customer inquiries, and order management.
            </p>
            <button onClick={openCreateModal} style={{ ...btnPrimary, background: "#25D366", color: "#000" }}>
              <i className="fa-solid fa-plus" /> Add Agent
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  style={{
                    ...card,
                    cursor: "pointer",
                    border: isSelected ? "2px solid #25D366" : "1px solid var(--border, #ffffff12)",
                    background: isSelected ? "var(--card, #1c1c36)" : "var(--card, #16162a)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                          {ag.name}
                        </h3>
                        <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 2 }}>
                          {ag.role === "admin_assistant" ? (
                            <span style={{ color: "#3b82f6" }}>⚡ Executive Business Assistant (Full Tools)</span>
                          ) : (
                            <span style={{ color: "#a855f7" }}>💬 Customer Support</span>
                          )}
                        </div>
                      </div>
                      <span style={badge(ag.workerRunning)}>
                        <span style={dot(ag.workerRunning)} />
                        {ag.workerRunning ? "Running" : "Stopped"}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted, #888)", display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                      <div>
                        WA Key: <span style={{ fontFamily: "monospace", color: "#10b981" }}>{ag.maskedWhatsappKey || "None"}</span>
                      </div>
                      <div>
                        Gemini AI:{" "}
                        <span style={{ fontFamily: "monospace", color: ag.hasGeminiKey ? "#10b981" : "#f59e0b" }}>
                          {ag.maskedGeminiKey || "Active"}
                        </span>
                      </div>
                      <div>
                        Active Chats: <span style={{ fontWeight: 600, color: "#e0e0e0" }}>{ag.activeChatsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border, #ffffff12)", paddingTop: 12 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAgent(ag);
                      }}
                      disabled={actionLoading}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: ag.workerRunning ? "#ef4444" : "#10b981",
                        color: "#fff",
                      }}
                    >
                      {ag.workerRunning ? (
                        <><i className="fa-solid fa-stop" style={{ marginRight: 4 }} /> Stop</>
                      ) : (
                        <><i className="fa-solid fa-play" style={{ marginRight: 4 }} /> Start</>
                      )}
                    </button>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ag);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border, #ffffff20)",
                          background: "transparent",
                          color: "#e0e0e0",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <i className="fa-solid fa-pen" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(ag.id, ag.name);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #ef444440",
                          background: "transparent",
                          color: "#ef4444",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Agent Conversation History */}
      {selectedAgent && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-comments" style={{ color: "#25D366" }} />
                Live WhatsApp Chats &mdash; {selectedAgent.name}
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted, #888)" }}>
                Auto-refreshes every 5s &bull; Agent executes database tools automatically
              </span>
            </div>

            {phones.length > 0 && (
              <select
                value={selectedPhone ?? ""}
                onChange={(e) => setSelectedPhone(e.target.value)}
                style={{
                  background: "var(--input, #0f0f23)",
                  color: "var(--foreground, #e0e0e0)",
                  border: "1px solid var(--border, #ffffff20)",
                  borderRadius: 6,
                  padding: "6px 12px",
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
              No conversations yet for {selectedAgent.name}. Send a WhatsApp message to start chatting!
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 520,
                overflowY: "auto",
                padding: "12px 0",
              }}
            >
              {turns.map((turn, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={msgBubble(turn.role === "user")}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
                      {turn.role === "user" ? (
                        <><i className="fa-solid fa-user" style={{ marginRight: 4 }} /> Customer</>
                      ) : (
                        <><i className="fa-solid fa-robot" style={{ marginRight: 4 }} /> {selectedAgent.name}</>
                      )}
                    </div>
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal / Form: Add or Edit Agent */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              ...card,
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--card, #16162a)",
              border: "1px solid var(--border, #ffffff25)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editingAgent.id ? `Edit Agent: ${editingAgent.name}` : "Add New WhatsApp Agent"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted, #888)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAgent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Agent Name */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                  Agent Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sales Executive Assistant or Support Bot"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Role / Capabilities */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                  Assistant Role &amp; Capabilities
                </label>
                <select
                  value={editingAgent.role}
                  onChange={(e) => setEditingAgent((prev) => ({ ...prev, role: e.target.value as any }))}
                  style={inputStyle}
                >
                  <option value="admin_assistant">
                    🚀 Executive Business Assistant (Full Tools: Sales stats, record sales, orders, stock, renewals)
                  </option>
                  <option value="customer_support">
                    💬 Customer Support Assistant (Product info, price check, order lookup)
                  </option>
                </select>
              </div>

              {/* WhatsApp Agent Key */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>
                    WhatsApp Agent API Key {!editingAgent.id && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  {editingAgent.id && (
                    <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>Leave blank to keep existing key</span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showWaKey ? "text" : "password"}
                    value={editingAgent.whatsappKey}
                    onChange={(e) => setEditingAgent((prev) => ({ ...prev, whatsappKey: e.target.value }))}
                    placeholder={editingAgent.id ? "Leave blank to keep current key" : "Paste your WhatsApp Agent Key"}
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaKey((prev) => !prev)}
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
                    <i className={showWaKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 4 }}>
                  From WhatsApp &gt; Settings &gt; Agents &gt; your agent key.
                </div>
              </div>

              {/* Gemini API Key */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                  Gemini API Key <span style={{ color: "var(--muted, #888)", fontWeight: 400 }}>(Optional - uses global key if empty)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showGemKey ? "text" : "password"}
                    value={editingAgent.geminiKey || ""}
                    onChange={(e) => setEditingAgent((prev) => ({ ...prev, geminiKey: e.target.value }))}
                    placeholder="Leave blank to use default Gemini key"
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemKey((prev) => !prev)}
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
                    <i className={showGemKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                  </button>
                </div>
              </div>

              {/* Custom System Prompt */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                  Custom Instructions / Prompt (Optional)
                </label>
                <textarea
                  value={editingAgent.systemPrompt || ""}
                  onChange={(e) => setEditingAgent((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="e.g. Always greet with 'SubscribAI Boss', provide answers in PKR, and mention current discounts."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    ...btnPrimary,
                    background: "#25D366",
                    color: "#000",
                    fontWeight: 700,
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  {actionLoading ? "Saving…" : <><i className="fa-solid fa-save" /> Save Agent</>}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #ffffff20)",
                    background: "transparent",
                    color: "var(--foreground, #e0e0e0)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
