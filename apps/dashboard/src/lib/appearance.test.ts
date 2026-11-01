import { UpdateBotSchema, type BotSettings } from "@alturia/shared";
import { describe, expect, it } from "vitest";
import {
  draftFromSettings,
  fitWithin,
  toPreviewConfig,
  toUpdateInput,
  validateDraft,
} from "./appearance";

const bot: BotSettings = {
  slug: "asis-altura",
  publicKey: "pk_asisaltura",
  name: "Asis Altura",
  greeting: "¡Hola!",
  theme: {
    primaryColor: "#0180E1",
    position: "bottom-right",
    avatarPreset: "hard-hat",
  },
  avatarUrl: "/api/bots/pk_asisaltura/avatar?v=2",
  persona:
    "Eres el asistente virtual de Asis Altura, un centro de capacitación.",
  escalationKeywords: ["asesor", "humano"],
  escalationReply: "Ya avisé al equipo.",
  faqQuickQuestions: ["¿Cuánto dura?"],
  features: ["CERTIFICATES", "QR", "APPOINTMENTS", "FAQ", "HUMAN_HANDOFF"],
  allowedOrigins: ["https://asisaltura.co"],
};

describe("Apariencia form model", () => {
  it("round-trips saved settings into a payload the API accepts", () => {
    const input = toUpdateInput(draftFromSettings(bot));
    expect(UpdateBotSchema.safeParse(input).success).toBe(true);
    expect(input.escalationKeywords).toEqual(["asesor", "humano"]);
    // Only self-service features are sent; the API keeps the rest.
    expect(input.features).toEqual(["FAQ", "HUMAN_HANDOFF"]);
  });

  it("cleans list fields: trims, drops blanks, one origin per line", () => {
    const draft = {
      ...draftFromSettings(bot),
      escalationKeywords: " asesor , ,queja ",
      faqQuickQuestions: ["  ¿Horario? ", ""],
      allowedOrigins: "https://a.co\n\n https://b.co ",
    };
    expect(toUpdateInput(draft)).toMatchObject({
      escalationKeywords: ["asesor", "queja"],
      faqQuickQuestions: ["¿Horario?"],
      allowedOrigins: ["https://a.co", "https://b.co"],
    });
  });

  it("flags the fields the API would reject, by field", () => {
    const errors = validateDraft({
      ...draftFromSettings(bot),
      primaryColor: "blue",
      persona: "corto",
      allowedOrigins: "https://site.co/ruta",
    });
    expect(Object.keys(errors).toSorted()).toEqual([
      "allowedOrigins",
      "persona",
      "primaryColor",
    ]);
  });

  it("previews the unsaved draft, keeping client-specific features", () => {
    const draft = {
      ...draftFromSettings(bot),
      features: [],
      primaryColor: "#7C2D12",
    };
    const config = toPreviewConfig(draft, bot, {
      kind: "upload",
      image: new Blob(),
      previewUrl: "blob:preview",
    });
    expect(config.features).toEqual(["CERTIFICATES", "QR", "APPOINTMENTS"]);
    expect(config.theme.primaryColor).toBe("#7C2D12");
    expect(config.avatarUrl).toBe("blob:preview");
    expect(
      toPreviewConfig(draft, bot, { kind: "remove" }).avatarUrl,
    ).toBeNull();
  });

  it("scales logos down to fit 256px, never up", () => {
    expect(fitWithin(1024, 512, 256)).toEqual({ width: 256, height: 128 });
    expect(fitWithin(100, 80, 256)).toEqual({ width: 100, height: 80 });
  });
});
