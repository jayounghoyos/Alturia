import {
  LoginResponseSchema,
  EscalationRecordSchema,
  type LoginResponse,
  type EscalationRecord,
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
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/escalations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired, please log in again");
  }
  if (!res.ok) throw new Error(`Failed to load escalations (${res.status})`);
  return z.array(EscalationRecordSchema).parse(await res.json());
}
