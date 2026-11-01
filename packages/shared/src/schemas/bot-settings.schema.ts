import { z } from "zod";
import {
  AvatarPresetSchema,
  BotFeatureSchema,
  HexColorSchema,
  SELF_SERVICE_FEATURES,
  WidgetPositionSchema,
} from "./bot-config.schema.js";

/** Largest avatar the API stores; the dashboard resizes uploads well below it. */
export const MAX_AVATAR_BYTES = 100 * 1024;
export const AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

const OriginSchema = z
  .string()
  .url()
  .refine(
    (value) => new URL(value).origin === value,
    "Usa solo el origen, como https://misitio.com (sin ruta ni / al final)",
  );

/** GET /api/admin/bot — everything the client's admin can see about their bot. */
export const BotSettingsSchema = z.object({
  slug: z.string(),
  publicKey: z.string(),
  name: z.string(),
  greeting: z.string(),
  theme: z.object({
    primaryColor: z.string(),
    position: WidgetPositionSchema,
    avatarPreset: AvatarPresetSchema,
  }),
  avatarUrl: z.string().nullable(),
  persona: z.string(),
  escalationKeywords: z.array(z.string()),
  escalationReply: z.string(),
  faqQuickQuestions: z.array(z.string()),
  features: z.array(BotFeatureSchema),
  allowedOrigins: z.array(z.string()),
});
export type BotSettings = z.infer<typeof BotSettingsSchema>;

/**
 * PATCH /api/admin/bot — every field optional. `features` only toggles the
 * self-service ones; client-specific features are kept as they are.
 */
export const UpdateBotSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    greeting: z.string().trim().min(1).max(300),
    theme: z
      .object({
        primaryColor: HexColorSchema,
        position: WidgetPositionSchema,
        avatarPreset: AvatarPresetSchema,
      })
      .partial(),
    persona: z.string().trim().min(20).max(4000),
    escalationKeywords: z.array(z.string().trim().min(2).max(40)).max(20),
    escalationReply: z.string().trim().min(1).max(300),
    faqQuickQuestions: z.array(z.string().trim().min(1).max(120)).max(6),
    features: z.array(z.enum(SELF_SERVICE_FEATURES)),
    allowedOrigins: z.array(OriginSchema).max(10),
  })
  .partial()
  .strict();
export type UpdateBotInput = z.infer<typeof UpdateBotSchema>;
