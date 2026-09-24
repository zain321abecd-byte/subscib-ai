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
  triggerBriefingAction,
  triggerRenewalWatchdogAction,
  triggerStuckOrdersAction,
  type AgentRuntimeStatus,
  type AgentStatusSummary,
  type ConversationTurn,
  type SaveAgentInput,
  type AgentReminderConfig,
  type AgentSecurityConfig,
  type AgentToolsConfig,
  type AgentReportsConfig,
} from "./actions";

// ── Styles & Design System ────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(18, 18, 34, 0.95) 100%)",
  borderRadius: 14,
  padding: "20px 24px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
};

const badge = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  background: active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
  color: active ? "#10b981" : "#ef4444",
  border: `1px solid ${active ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
});

const dot = (active: boolean): React.CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: active ? "#10b981" : "#ef4444",
  boxShadow: active ? "0 0 8px #10b981" : "none",
  animation: active ? "pulse 2s infinite" : "none",
});

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "var(--foreground, #e0e0e0)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(15, 15, 30, 0.8)",
  color: "var(--foreground, #e0e0e0)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 8,
  padding: "9px 13px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const msgBubble = (isUser: boolean): React.CSSProperties => ({
  maxWidth: "75%",
  padding: "10px 14px",
  borderRadius: 12,
  fontSize: 13,
  lineHeight: 1.5,
  background: isUser ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "rgba(30, 30, 50, 0.9)",
  color: isUser ? "#fff" : "var(--foreground, #e0e0e0)",
  alignSelf: isUser ? "flex-end" : "flex-start",
  border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  boxShadow: isUser ? "0 2px 10px rgba(16, 185, 129, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.2)",
});

export default function WhatsAppAgentClient() {
  const [summary, setSummary] = useState<AgentStatusSummary | null>(null);
  const [agents, setAgents] = useState<AgentRuntimeStatus[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [history, setHistory] = useState<Record<string, ConversationTurn[]>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  // Modal / Form state for Add/Edit Agent
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"general" | "reminders" | "security" | "tools" | "reports">("general");

  const [editingAgent, setEditingAgent] = useState<SaveAgentInput>({
    name: "",
    whatsappKey: "",
    geminiKey: "",
    aiProvider: "claude",
    anthropicKey: "",
    anthropicBaseUrl: "https://api.mwapi.dev/v1",
    anthropicModel: "claude-sonnet-4-6",
    role: "admin_assistant",
    systemPrompt: "",
    enabled: true,
  });

  const [showWaKey, setShowWaKey] = useState(false);
  const [showGemKey, setShowGemKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-dismiss alert banner after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

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

  async function handleTriggerBriefing() {
    setTriggerLoading("briefing");
    setError("");
    setSuccessMsg("");
    const res = await triggerBriefingAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("☀️ Morning briefing dispatched to target WhatsApp!");
    else setError(res.error);
  }

  async function handleTriggerRenewalWatchdog() {
    setTriggerLoading("renewal");
    setError("");
    setSuccessMsg("");
    const res = await triggerRenewalWatchdogAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("🔔 Renewal watchdog alert triggered!");
    else setError(res.error);
  }

  async function handleTriggerStuckOrders() {
    setTriggerLoading("stuck");
    setError("");
    setSuccessMsg("");
    const res = await triggerStuckOrdersAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("⚠️ Stuck orders check triggered!");
    else setError(res.error);
  }

  function openCreateModal() {
    setModalTab("general");
    setEditingAgent({
      name: "",
      whatsappKey: "",
      geminiKey: "",
      aiProvider: "claude",
      anthropicKey: "sk-71a97e5f71dd85bfcebe2f74f9fe554254ca7867c0ce0d1f3df78f4f73566a99",
      anthropicBaseUrl: "https://api.mwapi.dev/v1",
      anthropicModel: "claude-sonnet-4-6",
      role: "admin_assistant",
      adminPhones: "",
      reminders: {
        dailyBriefingEnabled: true,
        dailyBriefingTime: "09:00",
        dailyBriefingIncludeSales: true,
        dailyBriefingIncludeOrders: true,
        dailyBriefingIncludeRenewals: true,
        renewalsWatchdogEnabled: true,
        renewalsDaysAhead: 2,
        stuckOrdersAlertEnabled: true,
        stuckOrdersHours: 4,
        stockAlertEnabled: true,
        stockDaysAhead: 14,
        targetPhone: "",
      },
      security: {
        adminPhones: [],
        requireConfirmation: true,
        confirmationTtlMinutes: 5,
      },
      tools: {
        salesEnabled: true,
        ordersEnabled: true,
        productsEnabled: true,
        accountBookEnabled: true,
        couponsEnabled: true,
        stockEnabled: true,
        reportsEnabled: true,
      },
      reports: {
        defaultEmail: "amirmehboob921@gmail.com",
        autoEmailCsv: true,
      },
      systemPrompt: "",
      enabled: true,
    });
    setShowWaKey(false);
    setShowGemKey(false);
    setShowAnthropicKey(false);
    setModalOpen(true);
  }

  function openEditModal(ag: AgentRuntimeStatus) {
    setModalTab("general");
    setEditingAgent({
      id: ag.id,
      name: ag.name,
      whatsappKey: ag.whatsappKey || "",
      geminiKey: ag.geminiKey || "",
      aiProvider: ag.aiProvider || "claude",
      anthropicKey: ag.anthropicKey || (ag.hasAnthropicKey ? "sk-71a97e5f71dd85bfcebe2f74f9fe554254ca7867c0ce0d1f3df78f4f73566a99" : ""),
      anthropicBaseUrl: ag.anthropicBaseUrl || "https://api.mwapi.dev/v1",
      anthropicModel: ag.anthropicModel || "claude-sonnet-4-6",
      role: ag.role,
      adminPhones: ag.adminPhonesStr || (ag.adminPhones || []).join(", "),
      reminders: ag.reminders || {
        dailyBriefingEnabled: true,
        dailyBriefingTime: "09:00",
        dailyBriefingIncludeSales: true,
        dailyBriefingIncludeOrders: true,
        dailyBriefingIncludeRenewals: true,
        renewalsWatchdogEnabled: true,
        renewalsDaysAhead: 2,
        stuckOrdersAlertEnabled: true,
        stuckOrdersHours: 4,
        stockAlertEnabled: true,
        stockDaysAhead: 14,
        targetPhone: "",
      },
      security: ag.security || {
        adminPhones: ag.adminPhones || [],
        requireConfirmation: true,
        confirmationTtlMinutes: 5,
      },
      tools: ag.tools || {
        salesEnabled: true,
        ordersEnabled: true,
        productsEnabled: true,
        accountBookEnabled: true,
        couponsEnabled: true,
        stockEnabled: true,
        reportsEnabled: true,
      },
      reports: ag.reports || {
        defaultEmail: "amirmehboob921@gmail.com",
        autoEmailCsv: true,
      },
      systemPrompt: ag.systemPrompt || "",
      enabled: ag.enabled,
    });
    setShowWaKey(false);
    setShowGemKey(false);
    setShowAnthropicKey(false);
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
      setError(res.error);
    } else {
      setSuccessMsg(`Agent "${editingAgent.name}" saved successfully with custom configurations!`);
      setModalOpen(false);
      await fetchStatusAndAgents();
    }
  }

  function handleCopyPrompt(text: string) {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(text);
    setTimeout(() => setCopiedPrompt(null), 2500);
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const phones = Object.keys(history);
  const turns = selectedPhone ? history[selectedPhone] ?? [] : [];

  if (loading) {
    return (
      <div style={{ padding: "40px 28px", color: "var(--muted, #888)", display: "flex", alignItems: "center", gap: 12 }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "#25D366" }} />
        <span>Loading SubscribAI WhatsApp Executive Assistants…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Pulse keyframe animation */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }
        .hover-card:hover { transform: translateY(-2px); border-color: rgba(37, 211, 102, 0.4) !important; transition: all 0.2s ease; }
        .action-chip:hover { background: rgba(255, 255, 255, 0.08) !important; }
      `}</style>

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ color: "#fff", fontSize: 24 }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
                WhatsApp AI Assistants
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted, #888)" }}>
                Autonomous store management with 28 live database tools, scheduled watchdogs, and two-step security
              </p>
            </div>
          </div>
        </div>

        {/* Global CTA button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={openCreateModal}
            style={{
              ...btnPrimary,
              background: "linear-gradient(135deg, #25D366 0%, #10b981 100%)",
              color: "#052e16",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(37, 211, 102, 0.3)",
              padding: "10px 18px",
            }}
          >
            <i className="fa-solid fa-plus" /> Add New Agent
          </button>
        </div>
      </div>

      {/* ── Alerts & Notifications ─────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            ...card,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: "#ef4444" }} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 14 }}
          >
            &times;
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            ...card,
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6ee7b7",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fa-solid fa-circle-check" style={{ color: "#10b981" }} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg("")}
            style={{ background: "none", border: "none", color: "#6ee7b7", cursor: "pointer", fontSize: 14 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* ── Proactive Intelligence & Tools Hub ──────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted, #888)",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="fa-solid fa-bolt" style={{ color: "#f59e0b" }} /> Executive Automation Hub
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {/* Card 1: 9 AM Morning Briefing */}
          <div
            style={{
              ...card,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-sun" /> Morning Briefing
                </span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#7dd3fc" }}>
                  Daily 9:00 AM
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #94a3b8)", lineHeight: 1.4 }}>
                Yesterday revenue, today renewals due, and pending order counts.
              </p>
            </div>
            <button
              onClick={handleTriggerBriefing}
              disabled={triggerLoading === "briefing"}
              style={{
                ...btnSecondary,
                fontSize: 11,
                padding: "6px 12px",
                justifyContent: "center",
                borderColor: "rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
              }}
            >
              {triggerLoading === "briefing" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</>
              ) : (
                <><i className="fa-solid fa-paper-plane" /> Trigger Briefing</>
              )}
            </button>
          </div>

          {/* Card 2: 48h Renewal Watchdog */}
          <div
            style={{
              ...card,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-bell" /> Renewal Watchdog
                </span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(245, 158, 11, 0.15)", color: "#fcd34d" }}>
                  Daily 11:00 AM
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #94a3b8)", lineHeight: 1.4 }}>
                Scans customer subscriptions expiring within 48h with phone numbers.
              </p>
            </div>
            <button
              onClick={handleTriggerRenewalWatchdog}
              disabled={triggerLoading === "renewal"}
              style={{
                ...btnSecondary,
                fontSize: 11,
                padding: "6px 12px",
                justifyContent: "center",
                borderColor: "rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
              }}
            >
              {triggerLoading === "renewal" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Scanning…</>
              ) : (
                <><i className="fa-solid fa-magnifying-glass" /> Scan Renewals</>
              )}
            </button>
          </div>

          {/* Card 3: Stuck Orders Alert */}
          <div
            style={{
              ...card,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-triangle-exclamation" /> Stuck Orders Alert
                </span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
                  Every 4 Hours
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #94a3b8)", lineHeight: 1.4 }}>
                Alerts on pending store orders waiting for fulfillment &gt; 4 hours.
              </p>
            </div>
            <button
              onClick={handleTriggerStuckOrders}
              disabled={triggerLoading === "stuck"}
              style={{
                ...btnSecondary,
                fontSize: 11,
                padding: "6px 12px",
                justifyContent: "center",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
              }}
            >
              {triggerLoading === "stuck" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Checking…</>
              ) : (
                <><i className="fa-solid fa-shield-halved" /> Check Stuck Orders</>
              )}
            </button>
          </div>

          {/* Card 4: Customer Database CSV Export */}
          <div
            style={{
              ...card,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-file-csv" /> Customer Database
                </span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                  Live Ledger
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #94a3b8)", lineHeight: 1.4 }}>
                Complete customer &amp; subscription sales ledger download.
              </p>
            </div>
            <a
              href="https://subscribai-api.onrender.com/whatsapp-agent/export-customers.csv?token=327f860297ccec31bb1df9c1a500b1815e76d7d09604534ea7aa10d5f0f5cadc"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...btnSecondary,
                fontSize: 11,
                padding: "6px 12px",
                justifyContent: "center",
                textDecoration: "none",
                borderColor: "rgba(16, 185, 129, 0.3)",
                color: "#10b981",
              }}
            >
              <i className="fa-solid fa-download" /> Download CSV
            </a>
          </div>
        </div>
      </div>

      {/* ── Agents Grid ────────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted, #888)",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Configured Agents ({agents.length})</span>
          <span style={{ fontSize: 11, textTransform: "none", color: "var(--muted, #666)" }}>
            Click an agent to view conversation logs
          </span>
        </div>

        {agents.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(37, 211, 102, 0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <i className="fa-solid fa-robot" style={{ fontSize: 24, color: "#25D366" }} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>No WhatsApp Agents Configured</h3>
            <p style={{ margin: "0 0 18px", color: "var(--muted, #888)", fontSize: 13, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
              Deploy an executive assistant on WhatsApp to automate order updates, check revenue, and dispatch customer reports.
            </p>
            <button onClick={openCreateModal} style={{ ...btnPrimary, background: "#25D366", color: "#000", fontWeight: 700 }}>
              <i className="fa-solid fa-plus" /> Add First Agent
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              const hasWhitelist = (ag.adminPhones && ag.adminPhones.length > 0) || (ag.security?.adminPhones && ag.security.adminPhones.length > 0);
              const whitelistCount = ag.adminPhones?.length || ag.security?.adminPhones?.length || 0;

              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  style={{
                    ...card,
                    cursor: "pointer",
                    border: isSelected ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: isSelected ? "0 0 0 1px #10b981, 0 8px 28px rgba(16, 185, 129, 0.15)" : card.boxShadow,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    {/* Top Row: Name, Role & Status Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background:
                              ag.aiProvider === "gemini"
                                ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
                                : "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          }}
                        >
                          <i
                            className={ag.aiProvider === "gemini" ? "fa-solid fa-sparkles" : "fa-solid fa-bolt"}
                            style={{ color: "#fff", fontSize: 16 }}
                          />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{ag.name}</h3>
                          <div style={{ fontSize: 11, color: "var(--muted, #94a3b8)", marginTop: 2 }}>
                            {ag.role === "admin_assistant" ? (
                              <span style={{ color: "#38bdf8" }}>⚡ Executive Business Assistant</span>
                            ) : (
                              <span style={{ color: "#c084fc" }}>💬 Customer Support</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span style={badge(ag.workerRunning)}>
                        <span style={dot(ag.workerRunning)} />
                        {ag.workerRunning ? "Running" : "Stopped"}
                      </span>
                    </div>

                    {/* Metadata Chips Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "rgba(0, 0, 0, 0.25)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "var(--muted, #94a3b8)",
                      }}
                    >
                      <div>
                        WA Key: <span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 600 }}>{ag.maskedWhatsappKey || "None"}</span>
                      </div>
                      <div>
                        Active Chats: <span style={{ color: "#e0e0e0", fontWeight: 600 }}>{ag.activeChatsCount}</span>
                      </div>
                      <div>
                        AI Engine:{" "}
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                            background: ag.aiProvider === "gemini" ? "rgba(59, 130, 246, 0.2)" : "rgba(139, 92, 246, 0.2)",
                            color: ag.aiProvider === "gemini" ? "#60a5fa" : "#c084fc",
                          }}
                        >
                          {ag.aiProvider === "gemini" ? "Gemini 3.6" : `Claude (${ag.anthropicModel || "sonnet-4-6"})`}
                        </span>
                      </div>
                      <div>
                        Security:{" "}
                        <span style={{ color: hasWhitelist ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                          {hasWhitelist ? `🔒 ${whitelistCount} Admin(s)` : "🌐 Open Access"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingTop: 12,
                    }}
                  >
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
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: ag.workerRunning ? "#ef4444" : "#10b981",
                        color: "#fff",
                      }}
                    >
                      {ag.workerRunning ? (
                        <><i className="fa-solid fa-stop" style={{ marginRight: 4 }} /> Stop Agent</>
                      ) : (
                        <><i className="fa-solid fa-play" style={{ marginRight: 4 }} /> Start Agent</>
                      )}
                    </button>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ag);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "#e0e0e0",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <i className="fa-solid fa-sliders" style={{ color: "#38bdf8" }} /> Configure
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(ag.id, ag.name);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#ef4444",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                        title="Delete Agent"
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

      {/* ── Live WhatsApp Chat & Test Console ───────────────────────────────── */}
      {selectedAgent && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-comments" style={{ color: "#25D366" }} />
                Live Conversation Feed &mdash; {selectedAgent.name}
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted, #888)" }}>
                Auto-refreshes every 5s &bull; Direct tool execution logs &amp; customer inquiries
              </span>
            </div>

            {phones.length > 0 && (
              <select
                value={selectedPhone ?? ""}
                onChange={(e) => setSelectedPhone(e.target.value)}
                style={{
                  background: "rgba(15, 15, 30, 0.8)",
                  color: "#e0e0e0",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
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
            <div style={{ textAlign: "center", padding: "36px 16px" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(37, 211, 102, 0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <i className="fa-solid fa-inbox" style={{ color: "#25D366", fontSize: 20 }} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Ready for WhatsApp Messages</h3>
              <p style={{ margin: "0 0 20px", color: "var(--muted, #888)", fontSize: 13, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                Send a WhatsApp message from your phone to start chatting with <strong>{selectedAgent.name}</strong>. Or click any prompt below to copy it:
              </p>

              {/* Interactive prompt suggestion chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 720, margin: "0 auto" }}>
                {[
                  "How much sales revenue did we make this month?",
                  "Send me the complete sales report with CSV",
                  "List any pending orders in the store",
                  "Check upcoming renewals expiring this week",
                  "Show our account book balance (payables vs receivables)",
                  "Create coupon SAVE20 with 20% discount",
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleCopyPrompt(promptText)}
                    style={{
                      background: copiedPrompt === promptText ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${copiedPrompt === promptText ? "#10b981" : "rgba(255, 255, 255, 0.1)"}`,
                      color: copiedPrompt === promptText ? "#6ee7b7" : "var(--foreground, #e0e0e0)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className={copiedPrompt === promptText ? "fa-solid fa-check" : "fa-solid fa-copy"} style={{ fontSize: 11 }} />
                    &ldquo;{promptText}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 480,
                overflowY: "auto",
                padding: "8px 4px",
              }}
            >
              {turns.map((turn, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={msgBubble(turn.role === "user")}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8, display: "flex", alignItems: "center", gap: 5 }}>
                      {turn.role === "user" ? (
                        <><i className="fa-solid fa-user" /> Customer ({selectedPhone})</>
                      ) : (
                        <><i className="fa-solid fa-robot" /> {selectedAgent.name}</>
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

      {/* ── Comprehensive Modal: Add/Edit Agent with 5 Tabs ─────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#16162a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {editingAgent.id ? `Configure Agent — ${editingAgent.name}` : "Create New WhatsApp AI Agent"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted, #888)" }}>
                  Configure AI engine, proactive crons, security whitelist, and tool capabilities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--muted, #888)", fontSize: 20, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "0 24px",
                background: "rgba(0, 0, 0, 0.2)",
                overflowX: "auto",
              }}
            >
              {[
                { id: "general", label: "General & AI", icon: "fa-robot" },
                { id: "reminders", label: "Reminders (Crons)", icon: "fa-clock" },
                { id: "security", label: "Security & Whitelist", icon: "fa-shield-halved" },
                { id: "tools", label: "Live Tools (28)", icon: "fa-wrench" },
                { id: "reports", label: "Reports & Email", icon: "fa-file-lines" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id as any)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "12px 14px",
                    fontSize: 13,
                    fontWeight: modalTab === tab.id ? 700 : 500,
                    color: modalTab === tab.id ? "#25D366" : "var(--muted, #888)",
                    borderBottom: modalTab === tab.id ? "2px solid #25D366" : "2px solid transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className={`fa-solid ${tab.icon}`} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAgent} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* ── TAB 1: General & AI ────────────────────────────────────────── */}
              {modalTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Agent Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editingAgent.name}
                      onChange={(e) => setEditingAgent((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Primary Executive Assistant or Support Bot"
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Assistant Role &amp; Access Level
                    </label>
                    <select
                      value={editingAgent.role}
                      onChange={(e) => setEditingAgent((prev) => ({ ...prev, role: e.target.value as any }))}
                      style={inputStyle}
                    >
                      <option value="admin_assistant">
                        🚀 Executive Business Assistant (Full live database tools, reports, account book)
                      </option>
                      <option value="customer_support">
                        💬 Customer Support Assistant (Product pricing info &amp; order lookup only)
                      </option>
                    </select>
                  </div>

                  {/* WhatsApp API Key */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>
                        WhatsApp Agent API Key {!editingAgent.id && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      {editingAgent.id && editingAgent.whatsappKey && (
                        <span style={{ fontSize: 11, color: "#10b981" }}>Key loaded (click eye to view)</span>
                      )}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showWaKey ? "text" : "password"}
                        value={editingAgent.whatsappKey}
                        onChange={(e) => setEditingAgent((prev) => ({ ...prev, whatsappKey: e.target.value }))}
                        placeholder="Paste your WhatsApp Agent Bearer Key"
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
                  </div>

                  {/* AI Engine Selection */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                      AI Engine
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div
                        onClick={() => setEditingAgent((prev) => ({ ...prev, aiProvider: "claude" }))}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: editingAgent.aiProvider !== "gemini" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.1)",
                          background: editingAgent.aiProvider !== "gemini" ? "rgba(139, 92, 246, 0.12)" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#c084fc" }}>
                            <i className="fa-solid fa-bolt" style={{ marginRight: 6 }} /> Claude (MWAPI Gateway)
                          </span>
                          {editingAgent.aiProvider !== "gemini" && (
                            <i className="fa-solid fa-circle-check" style={{ color: "#8b5cf6" }} />
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>
                          Recommended • Quota-Free &amp; High-Speed Tool Calling
                        </span>
                      </div>

                      <div
                        onClick={() => setEditingAgent((prev) => ({ ...prev, aiProvider: "gemini" }))}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: editingAgent.aiProvider === "gemini" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)",
                          background: editingAgent.aiProvider === "gemini" ? "rgba(59, 130, 246, 0.12)" : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#60a5fa" }}>
                            <i className="fa-solid fa-sparkles" style={{ marginRight: 6 }} /> Google Gemini
                          </span>
                          {editingAgent.aiProvider === "gemini" && (
                            <i className="fa-solid fa-circle-check" style={{ color: "#3b82f6" }} />
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>
                          gemini-3.6-flash • Google AI Studio
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Claude Engine Details */}
                  {editingAgent.aiProvider !== "gemini" ? (
                    <>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <label style={{ fontSize: 13, fontWeight: 600 }}>Claude / MWAPI API Key</label>
                          {editingAgent.anthropicKey && (
                            <span style={{ fontSize: 11, color: "#10b981" }}>Key loaded</span>
                          )}
                        </div>
                        <div style={{ position: "relative" }}>
                          <input
                            type={showAnthropicKey ? "text" : "password"}
                            value={editingAgent.anthropicKey || ""}
                            onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicKey: e.target.value }))}
                            placeholder="sk-71a9... or leave blank for default gateway key"
                            style={{ ...inputStyle, paddingRight: 40 }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnthropicKey((prev) => !prev)}
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
                            <i className={showAnthropicKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                            Claude Model
                          </label>
                          <select
                            value={editingAgent.anthropicModel || "claude-sonnet-4-6"}
                            onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicModel: e.target.value }))}
                            style={inputStyle}
                          >
                            <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Fastest &amp; Best Accuracy)</option>
                            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (Ultra Fast)</option>
                            <option value="claude-opus-4-6">claude-opus-4-6 (Deep Reasoning)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                            Gateway Base URL
                          </label>
                          <input
                            type="text"
                            value={editingAgent.anthropicBaseUrl || "https://api.mwapi.dev/v1"}
                            onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicBaseUrl: e.target.value }))}
                            placeholder="https://api.mwapi.dev/v1"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                        Gemini API Key (Optional)
                      </label>
                      <input
                        type={showGemKey ? "text" : "password"}
                        value={editingAgent.geminiKey || ""}
                        onChange={(e) => setEditingAgent((prev) => ({ ...prev, geminiKey: e.target.value }))}
                        placeholder="Leave blank to use global GEMINI_API_KEY"
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {/* System Prompt */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Custom Persona / Instructions (Optional)
                    </label>
                    <textarea
                      value={editingAgent.systemPrompt || ""}
                      onChange={(e) => setEditingAgent((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                      placeholder="e.g. Always address me as 'SubscribAI Boss', format currency in PKR, and remind me of pending renewals."
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 2: Proactive Reminders (Crons) ───────────────────────── */}
              {modalTab === "reminders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--muted, #888)", marginBottom: 4 }}>
                    Configure automatic scheduled watchdogs that proactively run and notify your WhatsApp.
                  </div>

                  {/* Morning Briefing Config */}
                  <div style={{ ...card, padding: 16, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fa-solid fa-sun" /> Morning Executive Briefing
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingAgent.reminders?.dailyBriefingEnabled !== false}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, dailyBriefingEnabled: e.target.checked },
                            }))
                          }
                        />
                        <span style={{ color: "#e0e0e0" }}>Enabled</span>
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: 4 }}>
                          Scheduled Run Time
                        </label>
                        <input
                          type="text"
                          value={editingAgent.reminders?.dailyBriefingTime || "09:00"}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, dailyBriefingTime: e.target.value },
                            }))
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: 4 }}>
                          Included Data Modules
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={editingAgent.reminders?.dailyBriefingIncludeSales !== false}
                              onChange={(e) =>
                                setEditingAgent((prev) => ({
                                  ...prev,
                                  reminders: { ...prev.reminders, dailyBriefingIncludeSales: e.target.checked },
                                }))
                              }
                            />
                            <span>Yesterday Sales &amp; Revenue</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={editingAgent.reminders?.dailyBriefingIncludeOrders !== false}
                              onChange={(e) =>
                                setEditingAgent((prev) => ({
                                  ...prev,
                                  reminders: { ...prev.reminders, dailyBriefingIncludeOrders: e.target.checked },
                                }))
                              }
                            />
                            <span>Store Orders Status Breakdown</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Renewal Watchdog Config */}
                  <div style={{ ...card, padding: 16, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fa-solid fa-bell" /> Customer Renewal Watchdog
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingAgent.reminders?.renewalsWatchdogEnabled !== false}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, renewalsWatchdogEnabled: e.target.checked },
                            }))
                          }
                        />
                        <span style={{ color: "#e0e0e0" }}>Enabled</span>
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: 4 }}>
                          Alert Threshold Window
                        </label>
                        <select
                          value={editingAgent.reminders?.renewalsDaysAhead || 2}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, renewalsDaysAhead: Number(e.target.value) },
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value={1}>1 Day Before Expiry</option>
                          <option value={2}>2 Days Before (48 Hours - Default)</option>
                          <option value={3}>3 Days Before</option>
                          <option value={7}>7 Days Before (1 Week)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stuck Orders Config */}
                  <div style={{ ...card, padding: 16, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fa-solid fa-triangle-exclamation" /> Stuck Orders Watchdog
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingAgent.reminders?.stuckOrdersAlertEnabled !== false}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, stuckOrdersAlertEnabled: e.target.checked },
                            }))
                          }
                        />
                        <span style={{ color: "#e0e0e0" }}>Enabled</span>
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: 4 }}>
                          Pending Time Threshold
                        </label>
                        <select
                          value={editingAgent.reminders?.stuckOrdersHours || 4}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              reminders: { ...prev.reminders, stuckOrdersHours: Number(e.target.value) },
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value={2}>Pending &gt; 2 Hours</option>
                          <option value={4}>Pending &gt; 4 Hours (Default)</option>
                          <option value={8}>Pending &gt; 8 Hours</option>
                          <option value={24}>Pending &gt; 24 Hours (1 Day)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Target Phone */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Target WhatsApp Number for Reminders
                    </label>
                    <input
                      type="text"
                      value={editingAgent.reminders?.targetPhone || ""}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, targetPhone: e.target.value },
                        }))
                      }
                      placeholder="+923001234567 (defaults to first whitelisted admin number)"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "var(--muted, #888)", marginTop: 4 }}>
                      All morning briefings, renewal watchdog alerts, and stuck order notifications are sent to this WhatsApp number.
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: Security & Whitelist ──────────────────────────────── */}
              {modalTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Admin Phone Whitelist */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Admin WhatsApp Phone Whitelist (Comma-Separated)
                    </label>
                    <input
                      type="text"
                      value={typeof editingAgent.adminPhones === "string" ? editingAgent.adminPhones : (editingAgent.adminPhones || []).join(", ")}
                      onChange={(e) => setEditingAgent((prev) => ({ ...prev, adminPhones: e.target.value }))}
                      placeholder="e.g. +923001234567, 923123456789"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "var(--muted, #888)", marginTop: 4 }}>
                      🔒 Security Lock: Only incoming messages from these WhatsApp numbers will be allowed to execute store management commands (sales, orders, pricing, account book). Leave blank to allow any number (Open Mode).
                    </div>
                  </div>

                  {/* Two-Step Confirmation Settings */}
                  <div style={{ ...card, padding: 16, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fa-solid fa-key" style={{ color: "#10b981" }} /> Two-Step Confirmation (ACT-XXXX)
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editingAgent.security?.requireConfirmation !== false}
                          onChange={(e) =>
                            setEditingAgent((prev) => ({
                              ...prev,
                              security: { ...prev.security, requireConfirmation: e.target.checked },
                            }))
                          }
                        />
                        <span>Enabled</span>
                      </label>
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted, #888)", lineHeight: 1.4 }}>
                      Destructive operations (deleting a sale, creating coupons, toggling coupons, recording vendor/customer payments) will be staged and require the admin to reply <code>CONFIRM ACT-XXXX</code> before applying.
                    </p>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #888)", display: "block", marginBottom: 4 }}>
                        Confirmation Expiration Window
                      </label>
                      <select
                        value={editingAgent.security?.confirmationTtlMinutes || 5}
                        onChange={(e) =>
                          setEditingAgent((prev) => ({
                            ...prev,
                            security: { ...prev.security, confirmationTtlMinutes: Number(e.target.value) },
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value={3}>3 Minutes</option>
                        <option value={5}>5 Minutes (Default)</option>
                        <option value={10}>10 Minutes</option>
                        <option value={15}>15 Minutes</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: Tool Capabilities ─────────────────────────────────── */}
              {modalTab === "tools" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontSize: 13, color: "var(--muted, #888)" }}>
                    Select which live database tool groups this assistant is authorized to use:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    {[
                      { key: "salesEnabled", label: "Sales & Subscriptions", desc: "get_sales_summary, list_sales, record_sale, delete_sale, restore_sale" },
                      { key: "ordersEnabled", label: "Orders & Fulfillment", desc: "get_orders_summary, list_orders, update_order_status" },
                      { key: "productsEnabled", label: "Products & Pricing", desc: "list_products, update_product (price & in_stock)" },
                      { key: "accountBookEnabled", label: "Account Book (Payables/Receivables)", desc: "vendor_payables, customer_receivables, payment records" },
                      { key: "couponsEnabled", label: "Promo Codes & Coupons", desc: "list_coupons, create_coupon, toggle_coupon" },
                      { key: "stockEnabled", label: "Supplier Stock & Inventory", desc: "list_stock_items, get_expiring_stock" },
                      { key: "reportsEnabled", label: "Reports & CSV Exports", desc: "generate_report, export_customers_csv, send_email" },
                    ].map((toolGroup) => (
                      <div
                        key={toolGroup.key}
                        style={{
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.02)",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            style={{ marginTop: 2 }}
                            checked={(editingAgent.tools as any)?.[toolGroup.key] !== false}
                            onChange={(e) =>
                              setEditingAgent((prev) => ({
                                ...prev,
                                tools: { ...prev.tools, [toolGroup.key]: e.target.checked },
                              }))
                            }
                          />
                          <div>
                            <strong style={{ color: "#e0e0e0" }}>{toolGroup.label}</strong>
                            <div style={{ fontSize: 10, color: "var(--muted, #888)", marginTop: 2 }}>{toolGroup.desc}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB 5: Reports & Email ────────────────────────────────────── */}
              {modalTab === "reports" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Default Executive Reports Recipient Email
                    </label>
                    <input
                      type="email"
                      value={editingAgent.reports?.defaultEmail || "amirmehboob921@gmail.com"}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reports: { ...prev.reports, defaultEmail: e.target.value },
                        }))
                      }
                      placeholder="amirmehboob921@gmail.com"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "var(--muted, #888)", marginTop: 4 }}>
                      Whenever you ask WhatsApp: &ldquo;Send me sales report&rdquo;, the PDF/HTML report will be emailed here.
                    </div>
                  </div>

                  <div style={{ ...card, padding: 14, background: "rgba(255,255,255,0.02)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editingAgent.reports?.autoEmailCsv !== false}
                        onChange={(e) =>
                          setEditingAgent((prev) => ({
                            ...prev,
                            reports: { ...prev.reports, autoEmailCsv: e.target.checked },
                          }))
                        }
                      />
                      <span>Automatically attach downloadable CSV datasets to report emails</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 16 }}>
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
                    padding: "10px 18px",
                  }}
                >
                  {actionLoading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</> : <><i className="fa-solid fa-check" /> Save Configuration</>}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "transparent",
                    color: "#e0e0e0",
                    cursor: "pointer",
                    fontSize: 13,
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
