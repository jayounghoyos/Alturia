import {
  BotConfigSchema,
  ChatResponseSchema,
  type BotConfig,
  type ChatResponse,
} from "@alturia/shared";

export type { BotConfig };

const API_BASE_URL = import.meta.env.VITE_WIDGET_API_BASE_URL as string;

export async function fetchBotConfig(): Promise<BotConfig> {
  const res = await fetch(`${API_BASE_URL}/api/bot-config`);
  if (!res.ok) {
    throw new Error(`Failed to load bot config (${res.status})`);
  }
  return BotConfigSchema.parse(await res.json());
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }
  return ChatResponseSchema.parse(await res.json());
}

/** One anonymous visitor per browser, reused across visits. */
export function getOrCreateSessionId(): string {
  const key = "alturia-session";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  localStorage.setItem(key, fresh);
  return fresh;
}
