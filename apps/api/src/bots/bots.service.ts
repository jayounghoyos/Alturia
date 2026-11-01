import { Injectable, NotFoundException } from "@nestjs/common";
import { BotThemeSchema, type BotConfig } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_BOT_ID, type ResolvedBot } from "./bot.types";

/** Bots change rarely; a short TTL keeps one free-tier instance off the DB on every request. */
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  bot: ResolvedBot;
  expiresAt: number;
}

@Injectable()
export class BotsService {
  private readonly byId = new Map<string, CacheEntry>();
  private readonly byPublicKey = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /** Widget requests: the bot named by its public key, or the default bot when none is sent. */
  resolvePublic(publicKey: string | undefined): Promise<ResolvedBot> {
    return publicKey
      ? this.cached(this.byPublicKey, publicKey, { publicKey })
      : this.getById(DEFAULT_BOT_ID);
  }

  getById(id: string): Promise<ResolvedBot> {
    return this.cached(this.byId, id, { id });
  }

  /** Called after a bot is edited, and by tests that change bots directly. */
  invalidate(botId?: string): void {
    if (!botId) {
      this.byId.clear();
      this.byPublicKey.clear();
      return;
    }
    for (const cache of [this.byId, this.byPublicKey]) {
      for (const [key, entry] of cache) {
        if (entry.bot.id === botId) cache.delete(key);
      }
    }
  }

  /** The public, widget-facing view of a bot. */
  toConfig(bot: ResolvedBot): BotConfig {
    return {
      name: bot.name,
      greeting: bot.greeting,
      theme: BotThemeSchema.parse(bot.theme),
      avatarUrl: bot.avatar
        ? `/api/bots/${bot.publicKey}/avatar?v=${bot.avatar.version}`
        : null,
      features: bot.features,
      faqQuickQuestions: bot.faqQuickQuestions,
      handoffMessage: bot.escalationReply,
    };
  }

  private async cached(
    cache: Map<string, CacheEntry>,
    key: string,
    where: { id: string } | { publicKey: string },
  ): Promise<ResolvedBot> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.bot;

    const bot = await this.prisma.bot.findUnique({
      where,
      include: { avatar: { select: { version: true } } },
    });
    if (!bot) throw new NotFoundException("Unknown bot");
    cache.set(key, { bot, expiresAt: Date.now() + CACHE_TTL_MS });
    return bot;
  }
}
