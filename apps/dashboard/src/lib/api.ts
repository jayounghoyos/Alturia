import {
  BotSettingsSchema,
  EscalationDetailSchema,
  EscalationRecordSchema,
  KnowledgeSourceRecordSchema,
  LoginResponseSchema,
  MessageRecordSchema,
  type UpdateBotInput,
} from "@alturia/shared";
import { z } from "zod";
import type { Http } from "./http";

/** Every endpoint the dashboard calls, typed by the shared schemas. */
export function createApi(http: Http) {
  const { request } = http;
  return {
    login: (email: string, password: string) =>
      request("/api/auth/login", LoginResponseSchema, {
        method: "POST",
        json: { email, password },
      }),

    listEscalations: () =>
      request("/api/escalations", z.array(EscalationRecordSchema)),
    getEscalation: (id: string) =>
      request(
        `/api/escalations/${encodeURIComponent(id)}`,
        EscalationDetailSchema,
      ),
    reply: (id: string, content: string) =>
      request(
        `/api/escalations/${encodeURIComponent(id)}/reply`,
        MessageRecordSchema,
        {
          method: "POST",
          json: { content },
        },
      ),
    resolve: (id: string) =>
      request(`/api/escalations/${encodeURIComponent(id)}/resolve`, null, {
        method: "PATCH",
      }),

    listKnowledge: () =>
      request("/api/knowledge", z.array(KnowledgeSourceRecordSchema)),
    addKnowledge: (title: string, content: string) =>
      request("/api/knowledge", KnowledgeSourceRecordSchema, {
        method: "POST",
        json: { title, content },
      }),
    deleteKnowledge: (id: string) =>
      request(`/api/knowledge/${encodeURIComponent(id)}`, null, {
        method: "DELETE",
      }),

    getBot: () => request("/api/admin/bot", BotSettingsSchema),
    updateBot: (input: UpdateBotInput) =>
      request("/api/admin/bot", BotSettingsSchema, {
        method: "PATCH",
        json: input,
      }),
    uploadAvatar: (image: Blob) =>
      request("/api/admin/bot/avatar", BotSettingsSchema, {
        method: "PUT",
        body: image,
      }),
    removeAvatar: () =>
      request("/api/admin/bot/avatar", BotSettingsSchema, { method: "DELETE" }),

    /** Absolute URL for an API path (the bot's avatar). */
    url: http.resolve,
  };
}
export type Api = ReturnType<typeof createApi>;
