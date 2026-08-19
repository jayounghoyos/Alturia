import { Controller, Get } from "@nestjs/common";
import type { BotConfig } from "@alturia/shared";

// Design tokens from the original mockups (.pen): primary #16233A, accent #FF6B2C.
// primaryColor here uses the navy — described there as headers/dark surfaces,
// which is what this field drives (header bar, floating button, send button).
const BOT_CONFIG: BotConfig = {
  name: "Asis Altura",
  greeting: "¡Hola! Soy el asistente virtual de Asis Altura. ¿En qué te puedo ayudar hoy?",
  theme: { primaryColor: "#16233A", position: "bottom-right" },
};

@Controller("api/bot-config")
export class BotController {
  /** Public — no auth. Single fixed bot, no multi-tenancy. */
  @Get()
  getConfig(): BotConfig {
    return BOT_CONFIG;
  }
}
