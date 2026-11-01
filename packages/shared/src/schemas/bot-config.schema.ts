import { z } from "zod";

/**
 * What a bot can do. The client-specific features (certificates, QR,
 * appointments) read Asis Altura's own tables, so only the platform admin
 * turns them on; FAQ and HUMAN_HANDOFF are generic.
 */
export const BOT_FEATURES = [
  "CERTIFICATES",
  "QR",
  "APPOINTMENTS",
  "FAQ",
  "HUMAN_HANDOFF",
] as const;
export const BotFeatureSchema = z.enum(BOT_FEATURES);
export type BotFeature = z.infer<typeof BotFeatureSchema>;

/** Features a client's admin may toggle from the dashboard. */
export const SELF_SERVICE_FEATURES = [
  "FAQ",
  "HUMAN_HANDOFF",
] as const satisfies readonly BotFeature[];

/** Built-in avatar icons. Each app maps them to a Lucide icon (widget: src/icons.tsx). */
export const AVATAR_PRESETS = [
  "chat",
  "headset",
  "hard-hat",
  "shield",
  "spark",
  "building",
] as const;
export const AvatarPresetSchema = z.enum(AVATAR_PRESETS);
export type AvatarPreset = z.infer<typeof AvatarPresetSchema>;

/** Labels for the dashboard's preset picker. */
export const AVATAR_PRESET_LABELS: Record<AvatarPreset, string> = {
  chat: "Conversación",
  headset: "Soporte",
  "hard-hat": "Casco",
  shield: "Escudo",
  spark: "Destello",
  building: "Empresa",
};

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal como #0180E1");

export const WidgetPositionSchema = z.enum(["bottom-right", "bottom-left"]);
export type WidgetPosition = z.infer<typeof WidgetPositionSchema>;

/** Stored in Bot.theme (Json). Defaults keep older rows and older APIs readable. */
export const BotThemeSchema = z.object({
  primaryColor: z.string(),
  position: WidgetPositionSchema.catch("bottom-right"),
  avatarPreset: AvatarPresetSchema.catch("chat").default("chat"),
});
export type BotTheme = z.infer<typeof BotThemeSchema>;

/**
 * GET /api/bot-config — public. Every field added after the single-bot MVP
 * has a default, so a widget talking to an older API keeps working.
 */
export const BotConfigSchema = z.object({
  name: z.string(),
  greeting: z.string(),
  theme: BotThemeSchema,
  /** Relative to the API base URL; null means "use theme.avatarPreset". */
  avatarUrl: z.string().nullable().default(null),
  /** Unknown values from a newer API are dropped instead of failing the parse. */
  features: z
    .array(z.string())
    .transform((list) =>
      list.filter(
        (f): f is BotFeature => BotFeatureSchema.safeParse(f).success,
      ),
    )
    .default([...BOT_FEATURES]),
  faqQuickQuestions: z.array(z.string()).default([]),
  /** Shown in the widget after the visitor asks for a human. */
  handoffMessage: z.string().default(""),
});
export type BotConfig = z.infer<typeof BotConfigSchema>;
