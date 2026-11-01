import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from "@nestjs/common";
import type { BotRequest, ResolvedBot } from "./bot.types";

/** The bot this request belongs to, set by BotContextGuard. */
export const CurrentBot = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedBot => {
    const bot = ctx.switchToHttp().getRequest<BotRequest>().bot;
    if (!bot) {
      throw new InternalServerErrorException("Bot context missing");
    }
    return bot;
  },
);
