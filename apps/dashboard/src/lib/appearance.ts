import {
  MAX_AVATAR_BYTES,
  SELF_SERVICE_FEATURES,
  UpdateBotSchema,
  type AvatarPreset,
  type BotConfig,
  type BotSettings,
  type UpdateBotInput,
  type WidgetPosition,
} from "@alturia/shared";

type SelfServiceFeature = (typeof SELF_SERVICE_FEATURES)[number];

/** The Apariencia form's working copy, in the shapes its fields edit. */
export interface Draft {
  name: string;
  greeting: string;
  primaryColor: string;
  position: WidgetPosition;
  avatarPreset: AvatarPreset;
  persona: string;
  escalationReply: string;
  /** Comma separated in the field. */
  escalationKeywords: string;
  faqQuickQuestions: string[];
  features: SelfServiceFeature[];
  /** One per line in the field. */
  allowedOrigins: string;
}

/** A logo change waiting for Save. */
export type AvatarChange =
  | { kind: "keep" }
  | { kind: "upload"; image: Blob; previewUrl: string }
  | { kind: "remove" };

const isSelfService = (f: string): f is SelfServiceFeature =>
  (SELF_SERVICE_FEATURES as readonly string[]).includes(f);

export function draftFromSettings(bot: BotSettings): Draft {
  return {
    name: bot.name,
    greeting: bot.greeting,
    primaryColor: bot.theme.primaryColor.toUpperCase(),
    position: bot.theme.position,
    avatarPreset: bot.theme.avatarPreset,
    persona: bot.persona,
    escalationReply: bot.escalationReply,
    escalationKeywords: bot.escalationKeywords.join(", "),
    faqQuickQuestions: bot.faqQuickQuestions,
    features: bot.features.filter(isSelfService),
    allowedOrigins: bot.allowedOrigins.join("\n"),
  };
}

const splitList = (value: string, separator: RegExp) =>
  value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

export function toUpdateInput(draft: Draft): UpdateBotInput {
  return {
    name: draft.name,
    greeting: draft.greeting,
    theme: {
      primaryColor: draft.primaryColor,
      position: draft.position,
      avatarPreset: draft.avatarPreset,
    },
    persona: draft.persona,
    escalationReply: draft.escalationReply,
    escalationKeywords: splitList(draft.escalationKeywords, /,/),
    faqQuickQuestions: draft.faqQuickQuestions
      .map((q) => q.trim())
      .filter(Boolean),
    features: draft.features,
    allowedOrigins: splitList(draft.allowedOrigins, /\n/),
  };
}

/** Field → first error message, from the same schema the API validates with. */
export function validateDraft(
  draft: Draft,
): Partial<Record<keyof Draft, string>> {
  const result = UpdateBotSchema.safeParse(toUpdateInput(draft));
  if (result.success) return {};
  const errors: Partial<Record<keyof Draft, string>> = {};
  for (const issue of result.error.issues) {
    const [first, second] = issue.path;
    const field = (first === "theme" ? second : first) as keyof Draft;
    errors[field] ??= friendly(issue.message);
  }
  return errors;
}

function friendly(message: string): string {
  if (/at least/.test(message)) return "Es muy corto.";
  if (/at most/.test(message)) return "Es muy largo.";
  return message;
}

/** What the live preview renders: the draft as a widget config. */
export function toPreviewConfig(
  draft: Draft,
  bot: BotSettings,
  avatar: AvatarChange,
): BotConfig {
  return {
    name: draft.name || bot.name,
    greeting: draft.greeting || bot.greeting,
    theme: {
      primaryColor: /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor)
        ? draft.primaryColor
        : bot.theme.primaryColor,
      position: draft.position,
      avatarPreset: draft.avatarPreset,
    },
    avatarUrl:
      avatar.kind === "upload"
        ? avatar.previewUrl
        : avatar.kind === "remove"
          ? null
          : bot.avatarUrl,
    features: [
      ...bot.features.filter((f) => !isSelfService(f)),
      ...draft.features,
    ],
    faqQuickQuestions: draft.faqQuickQuestions
      .map((q) => q.trim())
      .filter(Boolean),
    handoffMessage: draft.escalationReply,
  };
}

/** Largest side of a stored logo; the widget shows it at 40px, so 256 is ample. */
export const AVATAR_SIZE = 256;

/** Scale (w, h) down to fit a square of `max`, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Turns any picked image into a small WebP, in the browser, so the API (and
 * its free-tier database) only ever stores a few kilobytes.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige una imagen (PNG, JPG o WebP).");
  }
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, AVATAR_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9),
  );
  if (!blob) throw new Error("No pudimos procesar esa imagen.");
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error(
      "La imagen sigue siendo muy pesada. Prueba con una más simple.",
    );
  }
  return blob;
}
