import { Controller, Get, Header } from "@nestjs/common";
import type { BotConfig } from "@alturia/shared";
import { Public } from "../auth/public.decorator";
import type { ResolvedBot } from "./bot.types";
import { BotsService } from "./bots.service";
import { CurrentBot } from "./current-bot.decorator";

/** Public — no auth. The widget's branding and enabled features. */
@Public()
@Controller("api/bot-config")
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Get()
  // Short on purpose: an edit from the dashboard shows up within a minute.
  @Header("Cache-Control", "public, max-age=60")
  getConfig(@CurrentBot() bot: ResolvedBot): BotConfig {
    return this.bots.toConfig(bot);
  }
}
