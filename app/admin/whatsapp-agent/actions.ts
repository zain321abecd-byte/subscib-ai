"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { internalApi } from "@/lib/internal-api";

/**
 * Server Actions for WhatsApp AI Agent & Multi-Agent Administration.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  const message = err instanceof Error ? err.message : fallback;
  return { ok: false, error: message };
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface AgentReminderConfig {
  dailyBriefingEnabled?: boolean;
  dailyBriefingTime?: string;
  dailyBriefingIncludeSales?: boolean;
  dailyBriefingIncludeOrders?: boolean;
  dailyBriefingIncludeRenewals?: boolean;
  dailyBriefingIncludeStock?: boolean;
  renewalsWatchdogEnabled?: boolean;
  renewalsScanTime?: string;
  renewalsDaysAhead?: number;
  renewalsIncludeContact?: boolean;
  renewalsPhone?: string;
  stuckOrdersAlertEnabled?: boolean;
  stuckOrdersHours?: number;
  stuckOrdersCheckFrequency?: string;
  stuckOrdersPhone?: string;
  stockAlertEnabled?: boolean;
  stockDaysAhead?: number;
  targetPhone?: string;
}

export interface AgentSecurityConfig {
  adminPhones?: string[];
  requireConfirmation?: boolean;
  confirmationTtlMinutes?: number;
}

export interface AgentToolsConfig {
  salesEnabled?: boolean;
  ordersEnabled?: boolean;
  productsEnabled?: boolean;
  accountBookEnabled?: boolean;
  couponsEnabled?: boolean;
  stockEnabled?: boolean;
  reportsEnabled?: boolean;
}

export interface AgentReportsConfig {
  defaultEmail?: string;
  autoEmailCsv?: boolean;
}

export interface AgentRuntimeStatus {
  id: string;
  name: string;
  role: "admin_assistant" | "customer_support";
  hasWhatsappKey: boolean;
  maskedWhatsappKey: string;
  whatsappKey?: string;
  hasGeminiKey: boolean;
  maskedGeminiKey: string;
  geminiKey?: string;
  aiProvider?: "claude" | "gemini";
  hasAnthropicKey?: boolean;
  maskedAnthropicKey?: string;
  anthropicKey?: string;
  anthropicBaseUrl?: string;
  anthropicModel?: string;
  adminPhones?: string[];
  adminPhonesStr?: string;
  lastActiveUserId?: string;
  reminders?: AgentReminderConfig;
  security?: AgentSecurityConfig;
  tools?: AgentToolsConfig;
  reports?: AgentReportsConfig;
  systemPrompt?: string;
  enabled: boolean;
  workerRunning: boolean;
  activeChatsCount: number;
}

export interface AgentStatusSummary {
  configured: boolean;
  hasWhatsappKey: boolean;
  maskedWhatsappKey?: string | null;
  hasGeminiKey: boolean;
  maskedGeminiKey?: string | null;
  enabled: boolean;
  workerRunning: boolean;
  totalAgents: number;
  runningAgentsCount: number;
  agents: AgentRuntimeStatus[];
}

export interface SaveAgentInput {
  id?: string;
  name: string;
  whatsappKey: string;
  geminiKey?: string;
  aiProvider?: "claude" | "gemini";
  anthropicKey?: string;
  anthropicBaseUrl?: string;
  anthropicModel?: string;
  role?: "admin_assistant" | "customer_support";
  adminPhones?: string[] | string;
  lastActiveUserId?: string;
  reminders?: AgentReminderConfig;
  security?: AgentSecurityConfig;
  tools?: AgentToolsConfig;
  reports?: AgentReportsConfig;
  systemPrompt?: string;
  enabled?: boolean;
}

export interface ConversationTurn {
  role: "user" | "model";
  text: string;
}

// ── Status & Multi-Agent Actions ──────────────────────────────────────────

export async function getAgentStatus(): Promise<Result<AgentStatusSummary>> {
  try {
    await requireAdmin("delivery:read");
    const data = await internalApi<AgentStatusSummary>("/whatsapp-agent/status");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not fetch agent status.");
  }
}

export async function listAgents(): Promise<Result<AgentRuntimeStatus[]>> {
  try {
    await requireAdmin("delivery:read");
    const data = await internalApi<AgentRuntimeStatus[]>("/whatsapp-agent/agents");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not list agents.");
  }
}

export async function saveAgent(input: SaveAgentInput): Promise<Result<{ agent: AgentRuntimeStatus }>> {
  try {
    await requireAdmin("delivery:send");
    const data = await internalApi<{ success: boolean; agent: AgentRuntimeStatus }>("/whatsapp-agent/agents", {
      method: "POST",
      body: input,
    });
    return { ok: true, data: { agent: data.agent } };
  } catch (err) {
    return fail(err, "Could not save agent.");
  }
}

export async function deleteAgent(id: string): Promise<Result> {
  try {
    await requireAdmin("delivery:send");
    await internalApi(`/whatsapp-agent/agents/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not delete agent.");
  }
}

export async function startAgent(id?: string): Promise<Result> {
  try {
    await requireAdmin("delivery:send");
    const path = id ? `/whatsapp-agent/agents/${id}/start` : "/whatsapp-agent/start";
    await internalApi(path, { method: "POST" });
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not start agent.");
  }
}

export async function stopAgent(id?: string): Promise<Result> {
  try {
    await requireAdmin("delivery:send");
    const path = id ? `/whatsapp-agent/agents/${id}/stop` : "/whatsapp-agent/stop";
    await internalApi(path, { method: "POST" });
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not stop agent.");
  }
}

export async function getAgentHistory(agentId?: string): Promise<Result<Record<string, ConversationTurn[]>>> {
  try {
    await requireAdmin("delivery:read");
    const path = agentId ? `/whatsapp-agent/agents/${agentId}/history` : "/whatsapp-agent/history";
    const data = await internalApi<Record<string, ConversationTurn[]>>(path);
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not fetch conversation history.");
  }
}

// ── Manual Proactive Reminder Triggers ────────────────────────────────────

export async function triggerBriefingAction(): Promise<Result<{ message: string }>> {
  try {
    await requireAdmin("delivery:send");
    const data = await internalApi<{ success: boolean; message: string }>("/whatsapp-agent/trigger-briefing", {
      method: "POST",
    });
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not trigger morning briefing.");
  }
}

export async function triggerRenewalWatchdogAction(): Promise<Result<{ message: string }>> {
  try {
    await requireAdmin("delivery:send");
    const data = await internalApi<{ success: boolean; message: string }>("/whatsapp-agent/trigger-renewal-watchdog", {
      method: "POST",
    });
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not trigger renewal watchdog.");
  }
}

export async function triggerStuckOrdersAction(): Promise<Result<{ message: string }>> {
  try {
    await requireAdmin("delivery:send");
    const data = await internalApi<{ success: boolean; message: string }>("/whatsapp-agent/trigger-stuck-orders", {
      method: "POST",
    });
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not trigger stuck orders check.");
  }
}

// Backward compatibility
export async function saveAgentKeys(input: { whatsappAgentKey?: string; geminiApiKey?: string }): Promise<Result> {
  const res = await saveAgent({
    id: "default",
    name: "Primary Business Assistant",
    whatsappKey: input.whatsappAgentKey || "",
    geminiKey: input.geminiApiKey,
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}
