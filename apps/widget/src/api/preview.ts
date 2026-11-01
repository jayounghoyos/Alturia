import type { BotConfig } from "@alturia/shared";
import type { ApiClient } from "./client";
import { es } from "../i18n/es";

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * Canned answers for the dashboard's live preview: every flow can be clicked
 * through without touching real data or spending LLM quota.
 */
export function createPreviewApi(
  config: () => BotConfig,
  resolveUrl: (path: string) => string,
): ApiClient {
  const course = {
    id: "preview-course",
    name: "Curso de ejemplo",
    type: "ADVANCED" as const,
  };
  return {
    fetchBotConfig: async () => config(),
    sendChatMessage: async () => ({
      reply: es.previewReply,
      lowConfidence: false,
      escalationOffered: false,
      awaitingHuman: false,
    }),
    lookupCertificate: async () => ({
      certificates: [
        { expirationType: "COURSE", status: "VALID", expiresAt: inDays(200) },
      ],
    }),
    lookupCertificateByQr: async () => ({
      certificates: [
        { expirationType: "COURSE", status: "VALID", expiresAt: inDays(200) },
      ],
    }),
    fetchCourses: async () => [course],
    fetchAvailability: async () => [
      {
        sessionId: "preview-session",
        date: inDays(7),
        time: "08:00",
        location: "Sede principal",
        availableSlots: 10,
      },
    ],
    createAppointment: async () => ({
      status: "CONFIRMED",
      confirmationCode: "ALT-PREVIEW",
      courseName: course.name,
      date: inDays(7),
      time: "08:00",
      location: "Sede principal",
    }),
    createEscalation: async () => undefined,
    fetchConversationMessages: async () => [],
    resolve: resolveUrl,
  };
}
