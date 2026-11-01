import type { Bot } from "@prisma/client";
import type { Request } from "express";

/** Asis Altura's bot: owner of every row written before bots existed. */
export const DEFAULT_BOT_ID = "bot_default";

/** Header the widget sends with the bot's public key. */
export const BOT_HEADER = "x-alturia-bot";

/** A bot as resolved for a request: never carries the avatar bytes. */
export type ResolvedBot = Bot & { avatar: { version: number } | null };

export interface AuthUser {
  id: string;
  email: string;
  botId: string;
}

export interface BotRequest extends Request {
  user?: AuthUser;
  bot?: ResolvedBot;
}
