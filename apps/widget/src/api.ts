import {
  BotConfigSchema,
  ChatResponseSchema,
  CertificateLookupResponseSchema,
  CourseSchema,
  AvailableSessionSchema,
  AppointmentConfirmationSchema,
  MessageRecordSchema,
  type BotConfig,
  type ChatResponse,
  type CertificateLookupResponse,
  type Course,
  type AvailableSession,
  type CreateAppointmentInput,
  type AppointmentConfirmation,
  type CreateEscalationInput,
  type MessageRecord,
} from "@alturia/shared";
import { z } from "zod";

export type { BotConfig };

const API_BASE_URL = import.meta.env.VITE_WIDGET_API_BASE_URL as string;

async function parseOrThrow<S extends z.ZodType>(
  res: Response,
  schema: S,
  label: string,
): Promise<z.infer<S>> {
  if (!res.ok) throw new Error(`${label} failed (${res.status})`);
  return schema.parse(await res.json());
}

export async function fetchBotConfig(): Promise<BotConfig> {
  const res = await fetch(`${API_BASE_URL}/api/bot-config`);
  return parseOrThrow(res, BotConfigSchema, "Loading bot config");
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
  return parseOrThrow(res, ChatResponseSchema, "Chat request");
}

/** Throws Error with message "NOT_FOUND" on 404 — callers render the friendly not-found bubble for that case. */
export async function lookupCertificate(nationalId: string): Promise<CertificateLookupResponse> {
  const res = await fetch(`${API_BASE_URL}/api/certificates/${nationalId}`);
  if (res.status === 404) throw new Error("NOT_FOUND");
  return parseOrThrow(res, CertificateLookupResponseSchema, "Certificate lookup");
}

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE_URL}/api/courses`);
  return parseOrThrow(res, z.array(CourseSchema), "Loading courses");
}

export async function fetchAvailability(courseId: string): Promise<AvailableSession[]> {
  const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/availability`);
  return parseOrThrow(res, z.array(AvailableSessionSchema), "Loading availability");
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentConfirmation> {
  const res = await fetch(`${API_BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res, AppointmentConfirmationSchema, "Booking appointment");
}

export async function createEscalation(input: CreateEscalationInput): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/escalations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Escalation failed (${res.status})`);
}

/** Polled after an escalation to pick up ADMIN replies typed from the dashboard. */
export async function fetchConversationMessages(sessionId: string): Promise<MessageRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/chat/${sessionId}/messages`);
  return parseOrThrow(res, z.array(MessageRecordSchema), "Loading conversation");
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
