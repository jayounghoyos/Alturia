import { z } from "zod";

export const BotThemeSchema = z.object({
  primaryColor: z.string(),
  position: z.enum(["bottom-right", "bottom-left"]),
});
export type BotTheme = z.infer<typeof BotThemeSchema>;

/** GET /api/bot-config — public, fixed single-bot config (no multi-tenancy). */
export const BotConfigSchema = z.object({
  name: z.string(),
  greeting: z.string(),
  theme: BotThemeSchema,
});
export type BotConfig = z.infer<typeof BotConfigSchema>;
