import { Body, Controller, Delete, Get, Patch, Put, Req } from "@nestjs/common";
import {
  MAX_AVATAR_BYTES,
  UpdateBotSchema,
  type UpdateBotInput,
} from "@alturia/shared";
import type { Request } from "express";
import { readRawBody } from "../common/raw-body";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { BotSettingsService } from "./bot-settings.service";
import type { ResolvedBot } from "./bot.types";
import { CurrentBot } from "./current-bot.decorator";

/** Admin-only (no @Public()) — the dashboard's "Apariencia" page edits the admin's own bot. */
@Controller("api/admin/bot")
export class BotAdminController {
  constructor(private readonly settings: BotSettingsService) {}

  @Get()
  get(@CurrentBot() bot: ResolvedBot) {
    return this.settings.toSettings(bot);
  }

  @Patch()
  update(
    @CurrentBot() bot: ResolvedBot,
    @Body(new ZodValidationPipe(UpdateBotSchema)) body: UpdateBotInput,
  ) {
    return this.settings.update(bot, body);
  }

  /** Body is the image itself (Content-Type: image/png | image/jpeg | image/webp). */
  @Put("avatar")
  async setAvatar(@CurrentBot() bot: ResolvedBot, @Req() req: Request) {
    return this.settings.setAvatar(
      bot,
      await readRawBody(req, MAX_AVATAR_BYTES),
    );
  }

  @Delete("avatar")
  removeAvatar(@CurrentBot() bot: ResolvedBot) {
    return this.settings.removeAvatar(bot);
  }
}
