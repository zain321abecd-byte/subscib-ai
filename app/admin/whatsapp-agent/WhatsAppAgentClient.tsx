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

// ── Apple Design System Tokens ───────────────────────────────────────────────

const surfaceCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  borderRadius: 20,
  padding: "22px 24px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 12px 36px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
};

const badgeStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  background: active ? "rgba(52, 199, 89, 0.14)" : "rgba(255, 69, 58, 0.14)",
  color: active ? "#30D158" : "#FF453A",
  border: `1px solid ${active ? "rgba(52, 199, 89, 0.28)" : "rgba(255, 69, 58, 0.28)"}`,
});

const dotStyle = (active: boolean): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: active ? "#30D158" : "#FF453A",
  boxShadow: active ? "0 0 8px rgba(48, 209, 88, 0.8)" : "none",
  animation: active ? "pulse 2.4s ease-in-out infinite" : "none",
});

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "linear-gradient(180deg, #34C759 0%, #28B14C 100%)",
  color: "#FFFFFF",
  boxShadow: "0 2px 10px rgba(52, 199, 89, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  fontWeight: 500,
  fontSize: 12.5,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(255, 255, 255, 0.07)",
  color: "#F5F5F7",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.045)",
  color: "#F5F5F7",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
};

const msgBubble = (isUser: boolean): React.CSSProperties => ({
  maxWidth: "75%",
  padding: "11px 16px",
  borderRadius: 18,
  fontSize: 13.5,
  lineHeight: 1.5,
  background: isUser
    ? "linear-gradient(180deg, #34C759 0%, #28B14C 100%)"
    : "rgba(255, 255, 255, 0.07)",
  color: "#FFFFFF",
  alignSelf: isUser ? "flex-end" : "flex-start",
  border: isUser ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.08)",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  boxShadow: isUser
    ? "0 3px 12px rgba(52, 199, 89, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
    : "0 3px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
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

  // ── Page View State (Fleet Hub vs Full Configuration Page) ────────────────
  const [activeView, setActiveView] = useState<"fleet" | "configure">("fleet");
  const [configTab, setConfigTab] = useState<"general" | "reminders" | "security" | "tools" | "reports">("general");

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
      const phones = Object.keys(res.data);
      if (phones.length > 0 && !selectedPhone) {
        setSelectedPhone(phones[0]);
      }
    }
  }, [selectedAgentId, selectedPhone]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      await fetchStatusAndAgents();
      if (!cancelled) setLoading(false);
    }
    load();

    pollRef.current = setInterval(() => {
      fetchStatusAndAgents();
      fetchHistory();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      cancelled = true;
    };
  }, [fetchStatusAndAgents, fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [selectedAgentId, fetchHistory]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleStart(id: string) {
    setActionLoading(true);
    setError("");
    const res = await startAgent(id);
    setActionLoading(false);
    if (res.ok) {
      setSuccessMsg("Agent started successfully.");
      fetchStatusAndAgents();
    } else {
      setError(res.error);
    }
  }

  async function handleStop(id: string) {
    setActionLoading(true);
    setError("");
    const res = await stopAgent(id);
    setActionLoading(false);
    if (res.ok) {
      setSuccessMsg("Agent paused.");
      fetchStatusAndAgents();
    } else {
      setError(res.error);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setActionLoading(true);
    setError("");
    const res = await deleteAgent(id);
    setActionLoading(false);
    if (res.ok) {
      setSuccessMsg(`Agent "${name}" deleted.`);
      if (selectedAgentId === id) setSelectedAgentId("");
      fetchStatusAndAgents();
    } else {
      setError(res.error);
    }
  }

  async function handleTriggerBriefing() {
    setTriggerLoading("briefing");
    setError("");
    const res = await triggerBriefingAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("☀️ Morning Executive Briefing triggered!");
    else setError(res.error);
  }

  async function handleTriggerRenewalWatchdog() {
    setTriggerLoading("renewal");
    setError("");
    const res = await triggerRenewalWatchdogAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("🔔 Customer Renewal Watchdog triggered!");
    else setError(res.error);
  }

  async function handleTriggerStuckOrders() {
    setTriggerLoading("stuck");
    setError("");
    const res = await triggerStuckOrdersAction();
    setTriggerLoading(null);
    if (res.ok) setSuccessMsg("⚠️ Stuck orders watchdog triggered!");
    else setError(res.error);
  }

  function openCreatePage() {
    setConfigTab("general");
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
        dailyBriefingIncludeStock: true,
        renewalsWatchdogEnabled: true,
        renewalsScanTime: "11:00",
        renewalsDaysAhead: 2,
        renewalsIncludeContact: true,
        renewalsPhone: "",
        stuckOrdersAlertEnabled: true,
        stuckOrdersHours: 4,
        stuckOrdersCheckFrequency: "4",
        stuckOrdersPhone: "",
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
    setActiveView("configure");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditPage(ag: AgentRuntimeStatus, defaultTab: "general" | "reminders" | "security" | "tools" | "reports" = "general") {
    setConfigTab(defaultTab);
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
      lastActiveUserId: ag.lastActiveUserId,
      reminders: ag.reminders || {
        dailyBriefingEnabled: true,
        dailyBriefingTime: "09:00",
        dailyBriefingIncludeSales: true,
        dailyBriefingIncludeOrders: true,
        dailyBriefingIncludeRenewals: true,
        dailyBriefingIncludeStock: true,
        renewalsWatchdogEnabled: true,
        renewalsScanTime: "11:00",
        renewalsDaysAhead: 2,
        renewalsIncludeContact: true,
        renewalsPhone: "",
        stuckOrdersAlertEnabled: true,
        stuckOrdersHours: 4,
        stuckOrdersCheckFrequency: "4",
        stuckOrdersPhone: "",
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
    setActiveView("configure");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openRemindersPage(ag?: AgentRuntimeStatus) {
    const target = ag || selectedAgent || agents[0];
    if (!target) return;
    openEditPage(target, "reminders");
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

    const payload: SaveAgentInput = {
      ...editingAgent,
      adminPhones:
        typeof editingAgent.adminPhones === "string"
          ? editingAgent.adminPhones
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : editingAgent.adminPhones,
    };

    const res = await saveAgent(payload);
    setActionLoading(false);

    if (res.ok) {
      setSuccessMsg(`Agent "${editingAgent.name}" saved successfully.`);
      setActiveView("fleet");
      fetchStatusAndAgents();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(res.error);
    }
  }

  function handleCopyPrompt(text: string) {
    navigator.clipboard?.writeText(text);
    setCopiedPrompt(text);
    setTimeout(() => setCopiedPrompt(null), 2500);
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const phones = selectedAgent ? Object.keys(history) : [];
  const turns = selectedAgent && selectedPhone ? history[selectedPhone] ?? [] : [];

  if (loading) {
    return (
      <div style={{ padding: "80px 32px", color: "#86868B", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "#30D158", fontSize: 22 }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: "#98989D" }}>Loading WhatsApp Assistants…</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── VIEW 2: DEDICATED FULL CONFIGURATION PAGE (Apple Settings Style) ──────
  // ══════════════════════════════════════════════════════════════════════════

  if (activeView === "configure") {
    return (
      <div
        style={{
          padding: "24px 20px 90px",
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
        }}
      >
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.92); } }
          .apple-btn:active { transform: scale(0.97) !important; }
          .apple-pill-btn { transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1); }
          .apple-pill-btn:hover { background: rgba(255, 255, 255, 0.12) !important; color: #FFFFFF !important; }
          .apple-pill-btn:active { transform: scale(0.97) !important; }
          .soft-input:focus { border-color: rgba(52, 199, 89, 0.5) !important; box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.15) !important; }
          .apple-tab { transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1); }
          .apple-tab:hover:not(.active) { color: #FFFFFF !important; background: rgba(255, 255, 255, 0.05) !important; }
        `}</style>

        {/* Top Navigation Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <button
            type="button"
            onClick={() => setActiveView("fleet")}
            className="apple-pill-btn"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#98989D",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 999,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back to Fleet
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveView("fleet")}
              className="apple-pill-btn"
              style={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveAgent(e as any)}
              disabled={actionLoading}
              className="apple-btn"
              style={btnPrimary}
            >
              {actionLoading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</> : <><i className="fa-solid fa-check" /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)", paddingBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#F5F5F7", letterSpacing: "-0.015em" }}>
            {editingAgent.id ? `Configure · ${editingAgent.name}` : "Create WhatsApp AI Agent"}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#86868B" }}>
            Configure model engine, automated reminder schedules, security whitelist, and operational tools
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ background: "rgba(255, 69, 58, 0.12)", border: "1px solid rgba(255, 69, 58, 0.25)", color: "#FF6961", padding: "12px 18px", borderRadius: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FF453A" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Apple-Style Segmented Control (Tabs) */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: 3,
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            gap: 4,
            overflowX: "auto",
          }}
        >
          {[
            { id: "general", label: "General & AI", icon: "fa-robot" },
            { id: "reminders", label: "Reminders & Times", icon: "fa-clock" },
            { id: "security", label: "Security & Whitelist", icon: "fa-shield-halved" },
            { id: "tools", label: "Live Tools (28)", icon: "fa-wrench" },
            { id: "reports", label: "Reports & Email", icon: "fa-file-lines" },
          ].map((tab) => {
            const isActive = configTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setConfigTab(tab.id as any)}
                className={`apple-tab ${isActive ? "active" : ""}`}
                style={{
                  flex: 1,
                  minWidth: 130,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  color: isActive ? "#FFFFFF" : "#98989D",
                  boxShadow: isActive ? "0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)" : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                }}
              >
                <i className={`fa-solid ${tab.icon}`} style={{ fontSize: 12, opacity: isActive ? 1 : 0.7 }} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: General & AI ────────────────────────────────────────── */}
        {configTab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-id-card" style={{ color: "#64D2FF", fontSize: 13 }} /> Agent Identity &amp; Role
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                    Agent Name <span style={{ color: "#FF453A" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Primary Executive Assistant"
                    className="soft-input"
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                    Operational Role
                  </label>
                  <select
                    value={editingAgent.role}
                    onChange={(e) => setEditingAgent((prev) => ({ ...prev, role: e.target.value as any }))}
                    className="soft-input"
                    style={inputStyle}
                  >
                    <option value="admin_assistant">
                      ⚡ Executive Business Assistant (28 live tools &amp; reports)
                    </option>
                    <option value="customer_support">
                      💬 Customer Support Assistant (Product lookup &amp; orders only)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-brands fa-whatsapp" style={{ color: "#30D158", fontSize: 14 }} /> WhatsApp Agent Key
              </h3>
              <div style={{ position: "relative" }}>
                <input
                  type={showWaKey ? "text" : "password"}
                  value={editingAgent.whatsappKey}
                  onChange={(e) => setEditingAgent((prev) => ({ ...prev, whatsappKey: e.target.value }))}
                  placeholder="Paste WhatsApp Agent Bearer Key"
                  className="soft-input"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowWaKey((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#86868B",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <i className={showWaKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#86868B", marginTop: 5 }}>
                Provided by your WhatsApp Business Gateway or API broker.
              </div>
            </div>

            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-brain" style={{ color: "#BF5AF2", fontSize: 13 }} /> AI Engine Selection
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div
                  onClick={() => setEditingAgent((prev) => ({ ...prev, aiProvider: "claude" }))}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: editingAgent.aiProvider !== "gemini" ? "1px solid rgba(191, 90, 242, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: editingAgent.aiProvider !== "gemini" ? "rgba(191, 90, 242, 0.1)" : "rgba(255, 255, 255, 0.02)",
                    boxShadow: editingAgent.aiProvider !== "gemini" ? "0 0 0 1px rgba(191, 90, 242, 0.25), 0 4px 16px rgba(191, 90, 242, 0.15)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#DA8FFF" }}>
                      <i className="fa-solid fa-bolt" style={{ marginRight: 6, color: "#BF5AF2" }} /> Claude (MWAPI Gateway)
                    </span>
                    {editingAgent.aiProvider !== "gemini" && (
                      <i className="fa-solid fa-circle-check" style={{ color: "#BF5AF2", fontSize: 15 }} />
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, color: "#98989D" }}>
                    Recommended &bull; Fast, High Accuracy Function Calling
                  </span>
                </div>

                <div
                  onClick={() => setEditingAgent((prev) => ({ ...prev, aiProvider: "gemini" }))}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: editingAgent.aiProvider === "gemini" ? "1px solid rgba(10, 132, 255, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: editingAgent.aiProvider === "gemini" ? "rgba(10, 132, 255, 0.1)" : "rgba(255, 255, 255, 0.02)",
                    boxShadow: editingAgent.aiProvider === "gemini" ? "0 0 0 1px rgba(10, 132, 255, 0.25), 0 4px 16px rgba(10, 132, 255, 0.15)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#64D2FF" }}>
                      <i className="fa-solid fa-sparkles" style={{ marginRight: 6, color: "#0A84FF" }} /> Google Gemini
                    </span>
                    {editingAgent.aiProvider === "gemini" && (
                      <i className="fa-solid fa-circle-check" style={{ color: "#0A84FF", fontSize: 15 }} />
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, color: "#98989D" }}>
                    gemini-2.5-flash &bull; Google AI Studio API Key
                  </span>
                </div>
              </div>

              {editingAgent.aiProvider !== "gemini" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                      Claude / MWAPI API Key
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showAnthropicKey ? "text" : "password"}
                        value={editingAgent.anthropicKey || ""}
                        onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicKey: e.target.value }))}
                        placeholder="sk-71a9... or leave blank for default gateway key"
                        className="soft-input"
                        style={{ ...inputStyle, paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnthropicKey((prev) => !prev)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#86868B",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        <i className={showAnthropicKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                        Claude Model
                      </label>
                      <select
                        value={editingAgent.anthropicModel || "claude-sonnet-4-6"}
                        onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicModel: e.target.value }))}
                        className="soft-input"
                        style={inputStyle}
                      >
                        <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Fastest &amp; Highest Accuracy)</option>
                        <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (Ultra Fast)</option>
                        <option value="claude-opus-4-6">claude-opus-4-6 (Deep Reasoning)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                        Gateway Base URL
                      </label>
                      <input
                        type="text"
                        value={editingAgent.anthropicBaseUrl || "https://api.mwapi.dev/v1"}
                        onChange={(e) => setEditingAgent((prev) => ({ ...prev, anthropicBaseUrl: e.target.value }))}
                        placeholder="https://api.mwapi.dev/v1"
                        className="soft-input"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                    Google Gemini API Key
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showGemKey ? "text" : "password"}
                      value={editingAgent.geminiKey || ""}
                      onChange={(e) => setEditingAgent((prev) => ({ ...prev, geminiKey: e.target.value }))}
                      placeholder="AIzaSy... (Gemini 2.5 Flash)"
                      className="soft-input"
                      style={{ ...inputStyle, paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGemKey((prev) => !prev)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#86868B",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      <i className={showGemKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-comment-dots" style={{ color: "#30D158", fontSize: 13 }} /> Custom System Prompt &amp; Persona
              </h3>
              <textarea
                value={editingAgent.systemPrompt || ""}
                onChange={(e) => setEditingAgent((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="e.g. Always address me as 'SubscribAI Boss', format currency in PKR, and highlight urgent renewals."
                rows={4}
                className="soft-input"
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              />
            </div>
          </div>
        )}

        {/* ── TAB 2: Reminders & Times ───────────────────────────────────── */}
        {configTab === "reminders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 1. Morning Executive Briefing */}
            <div style={surfaceCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="fa-solid fa-sun" style={{ color: "#64D2FF", fontSize: 15 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#F5F5F7" }}>Morning Executive Briefing</h3>
                    <span style={{ fontSize: 12, color: "#86868B" }}>Daily WhatsApp status snapshot sent every morning</span>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#F5F5F7" }}>
                  <input
                    type="checkbox"
                    style={{ width: 16, height: 16, accentColor: "#30D158" }}
                    checked={editingAgent.reminders?.dailyBriefingEnabled !== false}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, dailyBriefingEnabled: e.target.checked },
                      }))
                    }
                  />
                  <span>Enabled</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Scheduled Run Time
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={editingAgent.reminders?.dailyBriefingTime || "09:00"}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, dailyBriefingTime: e.target.value },
                        }))
                      }
                      className="soft-input"
                      style={{ ...inputStyle, flex: 2 }}
                    >
                      <option value="07:00">07:00 AM</option>
                      <option value="08:00">08:00 AM</option>
                      <option value="08:30">08:30 AM</option>
                      <option value="09:00">09:00 AM (Recommended)</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                    </select>
                    <input
                      type="time"
                      value={editingAgent.reminders?.dailyBriefingTime || "09:00"}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, dailyBriefingTime: e.target.value },
                        }))
                      }
                      className="soft-input"
                      style={{ ...inputStyle, flex: 1, minWidth: 90 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Recipient Phone
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
                    placeholder="+923001234567 (blank = first admin phone)"
                    className="soft-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 8 }}>
                  Included Data Modules
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { key: "dailyBriefingIncludeSales", label: "📊 Yesterday Sales & Revenue" },
                    { key: "dailyBriefingIncludeOrders", label: "📦 Store Orders Breakdown" },
                    { key: "dailyBriefingIncludeRenewals", label: "🔔 Today Renewals Due Summary" },
                    { key: "dailyBriefingIncludeStock", label: "🏢 Supplier Stock Expiry (<14d)" },
                  ].map((mod) => (
                    <label key={mod.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#F5F5F7", cursor: "pointer", background: "rgba(255, 255, 255, 0.03)", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <input
                        type="checkbox"
                        style={{ width: 15, height: 15, accentColor: "#30D158" }}
                        checked={(editingAgent.reminders as any)?.[mod.key] !== false}
                        onChange={(e) =>
                          setEditingAgent((prev) => ({
                            ...prev,
                            reminders: { ...prev.reminders, [mod.key]: e.target.checked },
                          }))
                        }
                      />
                      <span>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Customer Renewal Watchdog */}
            <div style={surfaceCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="fa-solid fa-bell" style={{ color: "#FFD60A", fontSize: 15 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#F5F5F7" }}>Customer Renewal Watchdog</h3>
                    <span style={{ fontSize: 12, color: "#86868B" }}>Alerts on upcoming expiring customer subscriptions</span>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#F5F5F7" }}>
                  <input
                    type="checkbox"
                    style={{ width: 16, height: 16, accentColor: "#30D158" }}
                    checked={editingAgent.reminders?.renewalsWatchdogEnabled !== false}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, renewalsWatchdogEnabled: e.target.checked },
                      }))
                    }
                  />
                  <span>Enabled</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Lookahead Window
                  </label>
                  <select
                    value={editingAgent.reminders?.renewalsDaysAhead || 2}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, renewalsDaysAhead: Number(e.target.value) },
                      }))
                    }
                    className="soft-input"
                    style={inputStyle}
                  >
                    <option value={1}>1 Day Before Expiry (24 Hours)</option>
                    <option value={2}>2 Days Before (48 Hours - Recommended)</option>
                    <option value={3}>3 Days Before (72 Hours)</option>
                    <option value={5}>5 Days Before</option>
                    <option value={7}>7 Days Before (1 Week)</option>
                    <option value={14}>14 Days Before (2 Weeks)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Scheduled Scan Time
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={editingAgent.reminders?.renewalsScanTime || "11:00"}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, renewalsScanTime: e.target.value },
                        }))
                      }
                      className="soft-input"
                      style={{ ...inputStyle, flex: 2 }}
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM (Default)</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="20:00">08:00 PM</option>
                    </select>
                    <input
                      type="time"
                      value={editingAgent.reminders?.renewalsScanTime || "11:00"}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, renewalsScanTime: e.target.value },
                        }))
                      }
                      className="soft-input"
                      style={{ ...inputStyle, flex: 1, minWidth: 90 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Alert Recipient Phone
                  </label>
                  <input
                    type="text"
                    value={editingAgent.reminders?.renewalsPhone || ""}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, renewalsPhone: e.target.value },
                      }))
                    }
                    placeholder="Defaults to admin phone"
                    className="soft-input"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", paddingTop: 20 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#F5F5F7", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      style={{ width: 16, height: 16, accentColor: "#30D158" }}
                      checked={editingAgent.reminders?.renewalsIncludeContact !== false}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          reminders: { ...prev.reminders, renewalsIncludeContact: e.target.checked },
                        }))
                      }
                    />
                    <span>Include customer phone numbers &amp; direct 1-tap WhatsApp link</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Stuck Orders Alert */}
            <div style={surfaceCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FF6961", fontSize: 15 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#F5F5F7" }}>Stuck Orders Watchdog</h3>
                    <span style={{ fontSize: 12, color: "#86868B" }}>Alerts when store orders remain unfulfilled beyond threshold</span>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#F5F5F7" }}>
                  <input
                    type="checkbox"
                    style={{ width: 16, height: 16, accentColor: "#30D158" }}
                    checked={editingAgent.reminders?.stuckOrdersAlertEnabled !== false}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, stuckOrdersAlertEnabled: e.target.checked },
                      }))
                    }
                  />
                  <span>Enabled</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Pending Threshold
                  </label>
                  <select
                    value={editingAgent.reminders?.stuckOrdersHours || 4}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, stuckOrdersHours: Number(e.target.value) },
                      }))
                    }
                    className="soft-input"
                    style={inputStyle}
                  >
                    <option value={1}>Pending &gt; 1 Hour (Urgent)</option>
                    <option value={2}>Pending &gt; 2 Hours</option>
                    <option value={4}>Pending &gt; 4 Hours (Recommended)</option>
                    <option value={8}>Pending &gt; 8 Hours</option>
                    <option value={12}>Pending &gt; 12 Hours</option>
                    <option value={24}>Pending &gt; 24 Hours</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                    Check Frequency
                  </label>
                  <select
                    value={editingAgent.reminders?.stuckOrdersCheckFrequency || "4"}
                    onChange={(e) =>
                      setEditingAgent((prev) => ({
                        ...prev,
                        reminders: { ...prev.reminders, stuckOrdersCheckFrequency: e.target.value },
                      }))
                    }
                    className="soft-input"
                    style={inputStyle}
                  >
                    <option value="1">Every 1 Hour</option>
                    <option value="2">Every 2 Hours</option>
                    <option value="4">Every 4 Hours (Standard)</option>
                    <option value="8">Every 8 Hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", display: "block", marginBottom: 6 }}>
                  Alert Recipient Phone
                </label>
                <input
                  type="text"
                  value={editingAgent.reminders?.stuckOrdersPhone || ""}
                  onChange={(e) =>
                    setEditingAgent((prev) => ({
                      ...prev,
                      reminders: { ...prev.reminders, stuckOrdersPhone: e.target.value },
                    }))
                  }
                  placeholder="Defaults to admin phone"
                  className="soft-input"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: Security & Whitelist ──────────────────────────────── */}
        {configTab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-phone-volume" style={{ color: "#64D2FF", fontSize: 13 }} /> Admin Phone Whitelist
              </h3>
              <input
                type="text"
                value={typeof editingAgent.adminPhones === "string" ? editingAgent.adminPhones : (editingAgent.adminPhones || []).join(", ")}
                onChange={(e) => setEditingAgent((prev) => ({ ...prev, adminPhones: e.target.value }))}
                placeholder="e.g. 03039251260, +923001234567, user:114937619824772"
                className="soft-input"
                style={inputStyle}
              />

              {/* Detected Meta WhatsApp Participant ID */}
              {(editingAgent.lastActiveUserId || selectedAgent?.lastActiveUserId) && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    background: "rgba(52, 199, 89, 0.08)",
                    border: "1px solid rgba(52, 199, 89, 0.22)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#30D158", display: "inline-block", boxShadow: "0 0 8px #30D158" }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F5F5F7" }}>
                        Connected WhatsApp Participant Detected
                      </div>
                      <div style={{ fontSize: 11.5, color: "#98989D" }}>
                        Meta Scoped ID: <code style={{ color: "#30D158", background: "rgba(52, 199, 89, 0.14)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{editingAgent.lastActiveUserId || selectedAgent?.lastActiveUserId}</code>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const idToAdd = editingAgent.lastActiveUserId || selectedAgent?.lastActiveUserId || "";
                      const current = typeof editingAgent.adminPhones === "string" 
                        ? editingAgent.adminPhones 
                        : (editingAgent.adminPhones || []).join(", ");
                      if (!current.includes(idToAdd)) {
                        const updated = current ? `${current}, ${idToAdd}` : idToAdd;
                        setEditingAgent((prev) => ({ ...prev, adminPhones: updated }));
                      }
                    }}
                    className="apple-pill-btn"
                    style={{
                      padding: "5px 12px",
                      fontSize: 11.5,
                      fontWeight: 500,
                      background: "rgba(52, 199, 89, 0.15)",
                      color: "#30D158",
                      border: "1px solid rgba(52, 199, 89, 0.3)",
                      borderRadius: 999,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ fontSize: 10 }} /> Sync to Whitelist
                  </button>
                </div>
              )}

              <div style={{ fontSize: 12, color: "#86868B", marginTop: 10, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 5 }}>
                <div>🔒 <strong>Security Whitelist:</strong> Only incoming WhatsApp messages from these numbers or Meta IDs are permitted to execute store management tools.</div>
                <div style={{ color: "#64D2FF" }}>💡 <strong>Meta Cloud Privacy:</strong> Meta WhatsApp Agent uses User-Scoped IDs (like <code>user:114937619824772</code>) instead of exposing raw mobile numbers. Your phone (<code>03039251260</code>) and Meta ID are automatically paired and authorized.</div>
              </div>
            </div>

            <div style={surfaceCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "#F5F5F7" }}>
                  Two-Step Confirmation for Destructive Actions
                </h3>
                <input
                  type="checkbox"
                  style={{ width: 16, height: 16, accentColor: "#30D158" }}
                  checked={editingAgent.security?.requireConfirmation !== false}
                  onChange={(e) =>
                    setEditingAgent((prev) => ({
                      ...prev,
                      security: { ...prev.security, requireConfirmation: e.target.checked },
                    }))
                  }
                />
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#86868B", lineHeight: 1.5 }}>
                Destructive operations (deleting a sale, promo creation, debt settlements) require replying: <code style={{ color: "#30D158", background: "rgba(52, 199, 89, 0.12)", padding: "2px 6px", borderRadius: 6 }}>CONFIRM ACT-XXXX</code>.
              </p>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "#98989D", marginBottom: 6, display: "block" }}>
                  Code Expiration Timer (TTL)
                </label>
                <select
                  value={editingAgent.security?.confirmationTtlMinutes || 5}
                  onChange={(e) =>
                    setEditingAgent((prev) => ({
                      ...prev,
                      security: { ...prev.security, confirmationTtlMinutes: Number(e.target.value) },
                    }))
                  }
                  className="soft-input"
                  style={inputStyle}
                >
                  <option value={3}>3 Minutes</option>
                  <option value={5}>5 Minutes (Recommended)</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: Tool Access (28 Live Tools) ────────────────────────── */}
        {configTab === "tools" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "#86868B" }}>
              Enable or disable specific database modules for this assistant.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "salesEnabled", title: "Sales & Subscriptions", desc: "Lookup, details, delete sale (with confirmation)" },
                { key: "ordersEnabled", title: "Store Orders", desc: "Order lookup, update status to paid/delivered" },
                { key: "productsEnabled", title: "Products & Pricing", desc: "Browse catalog, query retail pricing" },
                { key: "accountBookEnabled", title: "Account Book & Debts", desc: "Customer balances, record incoming payments" },
                { key: "couponsEnabled", title: "Discount Coupons", desc: "List active coupons, create new promos" },
                { key: "stockEnabled", title: "Supplier Inventory", desc: "Inspect expiring supplier credentials (<14d)" },
                { key: "reportsEnabled", title: "Executive Reports", desc: "Generate formatted PDF/HTML reports" },
              ].map((mod) => (
                <div
                  key={mod.key}
                  style={{
                    ...surfaceCard,
                    padding: "14px 16px",
                    borderRadius: 14,
                  }}
                >
                  <label style={{ display: "flex", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      style={{ width: 16, height: 16, marginTop: 2, accentColor: "#30D158" }}
                      checked={(editingAgent.tools as any)?.[mod.key] !== false}
                      onChange={(e) =>
                        setEditingAgent((prev) => ({
                          ...prev,
                          tools: { ...prev.tools, [mod.key]: e.target.checked },
                        }))
                      }
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F5F7" }}>{mod.title}</div>
                      <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>{mod.desc}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: Reports & Email ────────────────────────────────────── */}
        {configTab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={surfaceCard}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-envelope" style={{ color: "#64D2FF", fontSize: 13 }} /> Executive Reports Delivery Email
              </h3>
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
                className="soft-input"
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#86868B", marginTop: 6 }}>
                Whenever you text WhatsApp: &ldquo;Send me sales report&rdquo;, the executive report is emailed here.
              </div>
            </div>

            <div style={surfaceCard}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: "#F5F5F7", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: 16, height: 16, accentColor: "#30D158" }}
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

        {/* Floating Apple-Style Bottom Capsule Bar */}
        <div
          style={{
            position: "sticky",
            bottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "rgba(20, 20, 26, 0.82)",
            backdropFilter: "blur(28px) saturate(190%)",
            WebkitBackdropFilter: "blur(28px) saturate(190%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 999,
            padding: "10px 22px",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#86868B" }}>
            <i className="fa-solid fa-circle-check" style={{ color: "#30D158" }} />
            <span>Ready to save <strong style={{ color: "#F5F5F7" }}>{editingAgent.name || "Agent"}</strong></span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveView("fleet")}
              className="apple-pill-btn"
              style={{ ...btnSecondary, padding: "7px 16px", fontSize: 12.5 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveAgent(e as any)}
              disabled={actionLoading}
              className="apple-btn"
              style={{ ...btnPrimary, padding: "8px 22px", fontSize: 13 }}
            >
              {actionLoading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</> : <><i className="fa-solid fa-check" /> Save Configuration</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── VIEW 1: FLEET OVERVIEW & AUTOMATION HUB (Apple Design) ────────────────
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        padding: "24px 20px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 1200,
        margin: "0 auto",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.92); } }
        .apple-card { transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1); }
        .apple-card:hover { border-color: rgba(255, 255, 255, 0.14) !important; transform: translateY(-1px); box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important; }
        .apple-btn:active { transform: scale(0.97) !important; }
        .apple-pill-btn { transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1); }
        .apple-pill-btn:hover { background: rgba(255, 255, 255, 0.12) !important; color: #FFFFFF !important; }
        .apple-pill-btn:active { transform: scale(0.97) !important; }
        .action-chip { transition: all 0.18s cubic-bezier(0.25, 1, 0.5, 1); }
        .action-chip:hover { background: rgba(255, 255, 255, 0.1) !important; color: #FFFFFF !important; transform: translateY(-1px); }
        .action-chip:active { transform: scale(0.96) !important; }
      `}</style>

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: "rgba(52, 199, 89, 0.14)",
              border: "1px solid rgba(52, 199, 89, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#30D158",
              fontSize: 22,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            }}
          >
            <i className="fa-brands fa-whatsapp" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: "#F5F5F7", letterSpacing: "-0.015em" }}>
              WhatsApp AI Assistants &amp; Automation Hub
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#86868B" }}>
              Autonomous 24/7 operations &bull; 28 live database tools &bull; Scheduled proactive watchdogs
            </p>
          </div>
        </div>

        <button onClick={openCreatePage} className="apple-btn" style={btnPrimary}>
          <i className="fa-solid fa-plus" /> Add New Agent
        </button>
      </div>

      {/* ── Notification Banners ────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: "rgba(255, 69, 58, 0.12)", border: "1px solid rgba(255, 69, 58, 0.25)", color: "#FF6961", padding: "10px 18px", borderRadius: 14, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FF453A" }} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#FF6961", cursor: "pointer", fontSize: 16 }}>&times;</button>
        </div>
      )}

      {successMsg && (
        <div style={{ background: "rgba(52, 199, 89, 0.12)", border: "1px solid rgba(52, 199, 89, 0.25)", color: "#30D158", padding: "10px 18px", borderRadius: 14, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-circle-check" style={{ color: "#30D158" }} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} style={{ background: "none", border: "none", color: "#30D158", cursor: "pointer", fontSize: 16 }}>&times;</button>
        </div>
      )}

      {/* ── Apple-Style Scheduled Automations Section ──────────────────────── */}
      <div style={surfaceCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-bolt" style={{ color: "#30D158", fontSize: 13 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F5F7", letterSpacing: "-0.01em" }}>
              Scheduled Watchdogs &amp; Automations
            </span>
          </div>

          <button
            type="button"
            onClick={() => openRemindersPage(selectedAgent)}
            style={{
              background: "none",
              border: "none",
              color: "#64D2FF",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: 0,
            }}
          >
            Customize Schedules &rarr;
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {/* Item 1: Morning Briefing */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.025)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 14,
              padding: "15px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="fa-solid fa-sun" style={{ color: "#64D2FF", fontSize: 13 }} /> Morning Briefing
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#64D2FF", background: "rgba(10, 132, 255, 0.12)", border: "1px solid rgba(10, 132, 255, 0.22)", padding: "2px 8px", borderRadius: 999 }}>
                  {selectedAgent?.reminders?.dailyBriefingTime || "09:00"} AM
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#86868B", lineHeight: 1.45 }}>
                Yesterday revenue, store orders &amp; today renewals snapshot.
              </p>
            </div>

            <button
              onClick={handleTriggerBriefing}
              disabled={triggerLoading === "briefing"}
              className="apple-pill-btn"
              style={{
                width: "100%",
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                justifyContent: "center",
                background: "rgba(10, 132, 255, 0.1)",
                border: "1px solid rgba(10, 132, 255, 0.22)",
                color: "#64D2FF",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {triggerLoading === "briefing" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</>
              ) : (
                <><i className="fa-solid fa-paper-plane" /> Trigger Briefing Now</>
              )}
            </button>
          </div>

          {/* Item 2: Renewal Watchdog */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.025)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 14,
              padding: "15px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="fa-solid fa-bell" style={{ color: "#FFD60A", fontSize: 13 }} /> Renewal Watchdog
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#FFD60A", background: "rgba(255, 159, 10, 0.12)", border: "1px solid rgba(255, 159, 10, 0.22)", padding: "2px 8px", borderRadius: 999 }}>
                  {selectedAgent?.reminders?.renewalsScanTime || "11:00"} Daily ({selectedAgent?.reminders?.renewalsDaysAhead || 2}d)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#86868B", lineHeight: 1.45 }}>
                Scans expiring subscriptions and alerts with customer phone numbers.
              </p>
            </div>

            <button
              onClick={handleTriggerRenewalWatchdog}
              disabled={triggerLoading === "renewal"}
              className="apple-pill-btn"
              style={{
                width: "100%",
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                justifyContent: "center",
                background: "rgba(255, 159, 10, 0.1)",
                border: "1px solid rgba(255, 159, 10, 0.22)",
                color: "#FFD60A",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {triggerLoading === "renewal" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Scanning…</>
              ) : (
                <><i className="fa-solid fa-magnifying-glass" /> Scan Renewals Now</>
              )}
            </button>
          </div>

          {/* Item 3: Stuck Orders Watchdog */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.025)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 14,
              padding: "15px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FF6961", fontSize: 13 }} /> Stuck Orders
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#FF6961", background: "rgba(255, 69, 58, 0.12)", border: "1px solid rgba(255, 69, 58, 0.22)", padding: "2px 8px", borderRadius: 999 }}>
                  Every {selectedAgent?.reminders?.stuckOrdersCheckFrequency || "4"}h (&gt;{selectedAgent?.reminders?.stuckOrdersHours || 4}h)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#86868B", lineHeight: 1.45 }}>
                Alerts on pending store orders waiting for fulfillment beyond threshold.
              </p>
            </div>

            <button
              onClick={handleTriggerStuckOrders}
              disabled={triggerLoading === "stuck"}
              className="apple-pill-btn"
              style={{
                width: "100%",
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                justifyContent: "center",
                background: "rgba(255, 69, 58, 0.1)",
                border: "1px solid rgba(255, 69, 58, 0.22)",
                color: "#FF6961",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {triggerLoading === "stuck" ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Checking…</>
              ) : (
                <><i className="fa-solid fa-bell-concierge" /> Check Stuck Orders</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Active AI Assistants Fleet ──────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#F5F5F7", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-server" style={{ color: "#30D158", fontSize: 12 }} />
            Active AI Assistants ({agents.length})
          </h2>
          <span style={{ fontSize: 12, color: "#86868B" }}>
            Select an assistant to inspect conversation logs
          </span>
        </div>

        {agents.length === 0 ? (
          <div style={{ ...surfaceCard, textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(52, 199, 89, 0.14)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <i className="fa-brands fa-whatsapp" style={{ color: "#30D158", fontSize: 24 }} />
            </div>
            <h3 style={{ margin: "0 0 6px", color: "#F5F5F7", fontSize: 16 }}>No WhatsApp AI Agents Configured</h3>
            <p style={{ margin: "0 0 16px", color: "#86868B", fontSize: 13, maxWidth: 440, marginInline: "auto" }}>
              Create your first WhatsApp Business Assistant to automate sales queries, renewals, and operations.
            </p>
            <button onClick={openCreatePage} className="apple-btn" style={btnPrimary}>
              <i className="fa-solid fa-plus" /> Create Your First Agent
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  className="apple-card"
                  style={{
                    background: isSelected ? "rgba(255, 255, 255, 0.045)" : "rgba(255, 255, 255, 0.025)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    borderRadius: 20,
                    padding: "20px 24px",
                    cursor: "pointer",
                    border: isSelected ? "1px solid rgba(52, 199, 89, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: isSelected
                      ? "0 0 0 1px rgba(52, 199, 89, 0.18), 0 12px 36px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                      : "0 8px 24px -8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Top Row: Avatar + Name & Info + Quick Actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 13,
                          background: ag.aiProvider === "gemini" ? "rgba(10, 132, 255, 0.14)" : "rgba(175, 82, 222, 0.14)",
                          border: `1px solid ${ag.aiProvider === "gemini" ? "rgba(10, 132, 255, 0.28)" : "rgba(175, 82, 222, 0.28)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: ag.aiProvider === "gemini" ? "#64D2FF" : "#DA8FFF",
                          fontSize: 18,
                          flexShrink: 0,
                          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                        }}
                      >
                        <i className={ag.aiProvider === "gemini" ? "fa-solid fa-sparkles" : "fa-solid fa-bolt"} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 600, color: "#F5F5F7", letterSpacing: "-0.01em" }}>
                            {ag.name}
                          </h3>
                          <span style={badgeStyle(ag.workerRunning)}>
                            <span style={dotStyle(ag.workerRunning)} />
                            {ag.workerRunning ? "Running" : "Paused"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#86868B", marginTop: 3 }}>
                          <span>{ag.role === "admin_assistant" ? "Executive Assistant · 28 Live Tools" : "Customer Support"}</span>
                          <span style={{ color: "#3A3A3C" }}>&bull;</span>
                          <span style={{ color: "#D1D1D6" }}>
                            {ag.aiProvider === "gemini" ? "Google Gemini (gemini-2.5-flash)" : `Claude (${ag.anthropicModel || "claude-sonnet-4-6"})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditPage(ag)}
                        className="apple-pill-btn"
                        style={{
                          ...btnSecondary,
                          padding: "7px 16px",
                          fontSize: 12.5,
                          fontWeight: 500,
                        }}
                      >
                        <i className="fa-solid fa-sliders" style={{ color: "#64D2FF" }} /> Configure Agent
                      </button>

                      {ag.workerRunning ? (
                        <button
                          onClick={() => handleStop(ag.id)}
                          disabled={actionLoading}
                          className="apple-pill-btn"
                          style={{
                            ...btnSecondary,
                            padding: "7px 14px",
                            fontSize: 12.5,
                            color: "#FF453A",
                            background: "rgba(255, 69, 58, 0.1)",
                            borderColor: "rgba(255, 69, 58, 0.25)",
                          }}
                        >
                          <i className="fa-solid fa-pause" /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStart(ag.id)}
                          disabled={actionLoading}
                          className="apple-pill-btn"
                          style={{
                            ...btnSecondary,
                            padding: "7px 14px",
                            fontSize: 12.5,
                            color: "#30D158",
                            background: "rgba(52, 199, 89, 0.1)",
                            borderColor: "rgba(52, 199, 89, 0.25)",
                          }}
                        >
                          <i className="fa-solid fa-play" /> Start
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(ag.id, ag.name)}
                        disabled={actionLoading}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#636366",
                          padding: 6,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#FF453A")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#636366")}
                        title="Delete Agent"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Bottom Meta Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      fontSize: 12.5,
                      color: "#86868B",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span>WA Key: <code style={{ color: "#30D158", fontFamily: "monospace" }}>{ag.maskedWhatsappKey || "None"}</code></span>
                      <span style={{ color: "#3A3A3C" }}>&bull;</span>
                      <span>Active Chats: <strong style={{ color: "#F5F5F7" }}>{ag.activeChatsCount}</strong></span>
                      <span style={{ color: "#3A3A3C" }}>&bull;</span>
                      <span>Briefing: <strong style={{ color: "#64D2FF" }}>{ag.reminders?.dailyBriefingTime || "09:00"} AM</strong></span>
                      <span style={{ color: "#3A3A3C" }}>&bull;</span>
                      <span>Renewals: <strong style={{ color: "#FFD60A" }}>{ag.reminders?.renewalsScanTime || "11:00"} AM</strong></span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "#636366" }}>
                      Modules: Sales, Orders, Accounts, Coupons, Reports
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
        <div style={surfaceCard}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 12,
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              paddingBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: "#F5F5F7", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-comments" style={{ color: "#30D158", fontSize: 14 }} />
                Live Conversation Feed &mdash; {selectedAgent.name}
              </h2>
              <span style={{ fontSize: 12, color: "#86868B" }}>
                Auto-refreshes every 5s &bull; Direct tool execution logs &amp; customer inquiries
              </span>
            </div>

            {phones.length > 0 && (
              <select
                value={selectedPhone ?? ""}
                onChange={(e) => setSelectedPhone(e.target.value)}
                className="soft-input"
                style={{
                  ...inputStyle,
                  width: "auto",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 999,
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
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <i className="fa-solid fa-inbox" style={{ color: "#636366", fontSize: 20 }} />
              </div>
              <h4 style={{ margin: "0 0 4px", color: "#F5F5F7", fontSize: 14 }}>No Live Conversations Yet</h4>
              <p style={{ margin: "0 0 14px", color: "#86868B", fontSize: 12, maxWidth: 420, marginInline: "auto" }}>
                Send a WhatsApp message to this agent&apos;s phone number to start conversing and test tool execution.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 460,
                overflowY: "auto",
                padding: "6px 2px",
              }}
            >
              {turns.map((turn, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={msgBubble(turn.role === "user")}>
                    <div style={{ fontSize: 10.5, fontWeight: 500, marginBottom: 4, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
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

          {/* Quick-Prompt Testing Suggestions */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, color: "#86868B", letterSpacing: 0.2 }}>
              Try sending these commands to your WhatsApp Agent:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                "Show yesterday sales summary",
                "Check upcoming renewals in 48 hours",
                "List pending store orders",
                "Show customer balance for Ali",
                "Generate sales report and email me",
                "List active coupons",
                "Check expiring stock accounts",
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleCopyPrompt(cmd)}
                  className="action-chip"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    borderRadius: 999,
                    padding: "6px 13px",
                    fontSize: 12,
                    color: "#D1D1D6",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className={copiedPrompt === cmd ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ color: copiedPrompt === cmd ? "#30D158" : "#86868B" }} />
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
