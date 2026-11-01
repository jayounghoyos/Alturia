import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import {
  BotThemeSchema,
  SELF_SERVICE_FEATURES,
  type BotSettings,
  type UpdateBotInput,
} from "@alturia/shared";
import type { BotFeature } from "@prisma/client";
import { sniffImageMime } from "../common/raw-body";
import { PrismaService } from "../prisma/prisma.service";
import type { ResolvedBot } from "./bot.types";
import { BotsService } from "./bots.service";

const selfService: readonly BotFeature[] = SELF_SERVICE_FEATURES;

/** What a client's admin can read and change about their own bot. */
@Injectable()
export class BotSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bots: BotsService,
  ) {}

  toSettings(bot: ResolvedBot): BotSettings {
    const config = this.bots.toConfig(bot);
    return {
      slug: bot.slug,
      publicKey: bot.publicKey,
      name: bot.name,
      greeting: bot.greeting,
      theme: config.theme,
      avatarUrl: config.avatarUrl,
      persona: bot.persona,
      escalationKeywords: bot.escalationKeywords,
      escalationReply: bot.escalationReply,
      faqQuickQuestions: bot.faqQuickQuestions,
      features: bot.features,
      allowedOrigins: bot.allowedOrigins,
    };
  }

  async update(bot: ResolvedBot, input: UpdateBotInput): Promise<BotSettings> {
    const { theme, features, ...fields } = input;
    await this.prisma.bot.update({
      where: { id: bot.id },
      data: {
        ...fields,
        ...(theme && {
          theme: { ...BotThemeSchema.parse(bot.theme), ...theme },
        }),
        // Client-specific features are the platform admin's call: keep them.
        ...(features && {
          features: [
            ...bot.features.filter((f) => !selfService.includes(f)),
            ...features,
          ],
        }),
      },
    });
    return this.refreshed(bot.id);
  }

  async setAvatar(bot: ResolvedBot, bytes: Buffer): Promise<BotSettings> {
    const mime = sniffImageMime(bytes);
    if (!mime) {
      throw new UnsupportedMediaTypeException("Usa una imagen PNG, JPG o WebP");
    }
    // Copy into a plain ArrayBuffer-backed array, the type Prisma's Bytes expects.
    const data = new Uint8Array(bytes);
    await this.prisma.botAsset.upsert({
      where: { botId: bot.id },
      create: { botId: bot.id, bytes: data, mime },
      update: { bytes: data, mime, version: { increment: 1 } },
    });
    return this.refreshed(bot.id);
  }

  async removeAvatar(bot: ResolvedBot): Promise<BotSettings> {
    await this.prisma.botAsset.deleteMany({ where: { botId: bot.id } });
    return this.refreshed(bot.id);
  }

  async getAvatar(publicKey: string): Promise<{ bytes: Buffer; mime: string }> {
    const asset = await this.prisma.botAsset.findFirst({
      where: { bot: { publicKey } },
    });
    if (!asset) throw new NotFoundException();
    // Prisma 6 returns Uint8Array; Express needs a Buffer to send bytes.
    return { bytes: Buffer.from(asset.bytes), mime: asset.mime };
  }

  private async refreshed(botId: string): Promise<BotSettings> {
    this.bots.invalidate(botId);
    return this.toSettings(await this.bots.getById(botId));
  }
}
