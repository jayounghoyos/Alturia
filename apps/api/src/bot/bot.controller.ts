import { Controller, Get } from "@nestjs/common";
import type { BotConfig } from "@alturia/shared";
import { Public } from "../auth/public.decorator";

// Real brand color pulled from asistalturas.co's own CSS (getComputedStyle on
// their live headings/buttons — #0180E1), since the client never sent a
// brand manual. Supersedes the earlier invented navy/orange from the .pen
// mockups — see apps/widget/src/widget.css for the full extracted palette.
const BOT_CONFIG: BotConfig = {
  name: "Asis Altura",
  greeting: "¡Hola! Soy el asistente virtual de Asis Altura. ¿En qué te puedo ayudar hoy?",
  theme: { primaryColor: "#0180E1", position: "bottom-right" },
};

/** Public — no auth. Single fixed bot, no multi-tenancy. */
@Public()
@Controller("api/bot-config")
export class BotController {
  @Get()
  getConfig(): BotConfig {
    return BOT_CONFIG;
  }
}
