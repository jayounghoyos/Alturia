import {
  LoginResponseSchema,
  EscalationRecordSchema,
  EscalationDetailSchema,
  MessageRecordSchema,
  KnowledgeSourceRecordSchema,
  type LoginResponse,
  type EscalationRecord,
  type EscalationDetail,
  type MessageRecord,
  type KnowledgeSourceRecord,
} from "@alturia/shared";
import { z } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const TOKEN_KEY = "alturia-admin-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired, please log in again");
  }
  return res;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Login failed (${res.status})`);
  }
  const parsed = LoginResponseSchema.parse(await res.json());
  localStorage.setItem(TOKEN_KEY, parsed.accessToken);
  return parsed;
}

export async function fetchEscalations(): Promise<EscalationRecord[]> {
  const res = await authedFetch("/api/escalations");
  if (!res.ok) throw new Error(`Failed to load escalations (${res.status})`);
  return z.array(EscalationRecordSchema).parse(await res.json());
}

export async function fetchEscalationDetail(id: string): Promise<EscalationDetail> {
  const res = await authedFetch(`/api/escalations/${id}`);
  if (!res.ok) throw new Error(`Failed to load escalation (${res.status})`);
  return EscalationDetailSchema.parse(await res.json());
}

export async function replyToEscalation(id: string, content: string): Promise<MessageRecord> {
  const res = await authedFetch(`/api/escalations/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to send reply (${res.status})`);
  return MessageRecordSchema.parse(await res.json());
}

export async function resolveEscalation(id: string): Promise<void> {
  const res = await authedFetch(`/api/escalations/${id}/resolve`, { method: "PATCH" });
  if (!res.ok) throw new Error(`Failed to resolve escalation (${res.status})`);
}

export async function fetchKnowledge(): Promise<KnowledgeSourceRecord[]> {
  const res = await authedFetch("/api/knowledge");
  if (!res.ok) throw new Error(`Failed to load knowledge (${res.status})`);
  return z.array(KnowledgeSourceRecordSchema).parse(await res.json());
}

export async function uploadKnowledge(title: string, content: string): Promise<KnowledgeSourceRecord> {
  const res = await authedFetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(`Failed to upload document (${res.status})`);
  return KnowledgeSourceRecordSchema.parse(await res.json());
}

export async function deleteKnowledge(id: string): Promise<void> {
  const res = await authedFetch(`/api/knowledge/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete document (${res.status})`);
}
