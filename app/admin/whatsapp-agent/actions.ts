"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { internalApi } from "@/lib/internal-api";

/**
 * Server Actions for WhatsApp AI Agent administration.
 *
 * All mutations gate on `delivery:send` and call the NestJS backend via
 * the shared internal token. The agent is toggled (start/stop) from the
 * admin panel; the backend worker does all polling + AI replies.
 */

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  const message = err instanceof Error ? err.message : fallback;
  return { ok: false, error: message };
}

// ── status ────────────────────────────────────────────────────────────────

export interface AgentStatus {
  configured: boolean;
  enabled: boolean;
  workerRunning: boolean;
}

export async function getAgentStatus(): Promise<Result<AgentStatus>> {
  try {
    await requireAdmin("delivery:read");
    const data = await internalApi<AgentStatus>("/whatsapp-agent/status");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not fetch agent status.");
  }
}

// ── start / stop ──────────────────────────────────────────────────────────

export async function startAgent(): Promise<Result> {
  try {
    await requireAdmin("delivery:send");
    await internalApi("/whatsapp-agent/start", { method: "POST" });
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not start the agent.");
  }
}

export async function stopAgent(): Promise<Result> {
  try {
    await requireAdmin("delivery:send");
    await internalApi("/whatsapp-agent/stop", { method: "POST" });
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not stop the agent.");
  }
}

// ── history ───────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: "user" | "model";
  text: string;
}

export async function getAgentHistory(): Promise<Result<Record<string, ConversationTurn[]>>> {
  try {
    await requireAdmin("delivery:read");
    const data = await internalApi<Record<string, ConversationTurn[]>>("/whatsapp-agent/history");
    return { ok: true, data };
  } catch (err) {
    return fail(err, "Could not fetch conversation history.");
  }
}
