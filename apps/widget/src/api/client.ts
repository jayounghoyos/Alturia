import {
  AppointmentConfirmationSchema,
  AvailableSessionSchema,
  BotConfigSchema,
  CertificateLookupResponseSchema,
  ChatResponseSchema,
  CourseSchema,
  MessageRecordSchema,
  type AppointmentConfirmation,
  type AvailableSession,
  type BotConfig,
  type CertificateLookupResponse,
  type ChatResponse,
  type Course,
  type CreateAppointmentInput,
  type CreateEscalationInput,
  type MessageRecord,
} from "@alturia/shared";
import { z } from "zod";

/** Render's free tier can take ~1 min to wake up; don't hang forever on it. */
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const isNotFound = (error: unknown) =>
  error instanceof ApiError && error.status === 404;

/** The session belongs to another bot (two bots on one site, or a stale id). */
export const isSessionConflict = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

export interface ApiClient {
  fetchBotConfig(): Promise<BotConfig>;
  sendChatMessage(sessionId: string, message: string): Promise<ChatResponse>;
  lookupCertificate(nationalId: string): Promise<CertificateLookupResponse>;
  lookupCertificateByQr(payload: string): Promise<CertificateLookupResponse>;
  fetchCourses(): Promise<Course[]>;
  fetchAvailability(courseId: string): Promise<AvailableSession[]>;
  createAppointment(
    input: CreateAppointmentInput,
  ): Promise<AppointmentConfirmation>;
  createEscalation(input: CreateEscalationInput): Promise<void>;
  fetchConversationMessages(sessionId: string): Promise<MessageRecord[]>;
  /** Absolute URL for an API path such as the bot's avatar. */
  resolve(path: string): string;
}

export function createApiClient({
  baseUrl,
  botKey,
}: {
  baseUrl: string;
  botKey?: string;
}): ApiClient {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<S extends z.ZodType>(
    path: string,
    schema: S | null,
    init: { method?: string; body?: unknown } = {},
  ): Promise<z.infer<S>> {
    const headers: Record<string, string> = {};
    if (botKey) headers["X-Alturia-Bot"] = botKey;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`${root}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new ApiError(res.status, `${init.method ?? "GET"} ${path} failed`);
    }
    return schema ? schema.parse(await res.json()) : undefined;
  }

  return {
    fetchBotConfig: () => request("/api/bot-config", BotConfigSchema),
    sendChatMessage: (sessionId, message) =>
      request("/api/chat", ChatResponseSchema, {
        method: "POST",
        body: { sessionId, message },
      }),
    lookupCertificate: (nationalId) =>
      request(
        `/api/certificates/${encodeURIComponent(nationalId)}`,
        CertificateLookupResponseSchema,
      ),
    lookupCertificateByQr: (payload) =>
      request("/api/certificates/qr", CertificateLookupResponseSchema, {
        method: "POST",
        body: { payload },
      }),
    fetchCourses: () => request("/api/courses", z.array(CourseSchema)),
    fetchAvailability: (courseId) =>
      request(
        `/api/courses/${encodeURIComponent(courseId)}/availability`,
        z.array(AvailableSessionSchema),
      ),
    createAppointment: (input) =>
      request("/api/appointments", AppointmentConfirmationSchema, {
        method: "POST",
        body: input,
      }),
    createEscalation: (input) =>
      request("/api/escalations", null, { method: "POST", body: input }),
    fetchConversationMessages: (sessionId) =>
      request(
        `/api/chat/${encodeURIComponent(sessionId)}/messages`,
        z.array(MessageRecordSchema),
      ),
    resolve: (path) => (/^https?:\/\//.test(path) ? path : `${root}${path}`),
  };
}
