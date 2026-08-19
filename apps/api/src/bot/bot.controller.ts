import { Controller, Get } from "@nestjs/common";
import type { BotConfig } from "@alturia/shared";
import { Public } from "../auth/public.decorator";

// Design tokens from the original mockups (.pen): primary #16233A, accent #FF6B2C.
// primaryColor here uses the navy — described there as headers/dark surfaces,
// which is what this field drives (header bar, floating button, send button).
const BOT_CONFIG: BotConfig = {
  name: "Asis Altura",
  greeting: "¡Hola! Soy el asistente virtual de Asis Altura. ¿En qué te puedo ayudar hoy?",
  theme: { primaryColor: "#16233A", position: "bottom-right" },
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
