import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { BotFeature } from "@prisma/client";
import { BOT_HEADER, type BotRequest } from "./bot.types";
import { BotsService } from "./bots.service";
import { REQUIRED_FEATURES_KEY } from "./requires-feature.decorator";

/**
 * Registered after JwtAuthGuard. Decides which bot a request belongs to:
 * - an admin request (valid JWT) is always scoped to that admin's bot;
 * - a widget request names its bot with the X-Alturia-Bot header, and falls
 *   back to the default bot so embeds from before bots existed keep working.
 * Then enforces @RequiresFeature and the bot's optional origin list.
 */
@Injectable()
export class BotContextGuard implements CanActivate {
  constructor(
    private readonly bots: BotsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<BotRequest>();

    const bot = req.user
      ? await this.bots.getById(req.user.botId)
      : await this.bots.resolvePublic(headerValue(req.headers[BOT_HEADER]));

    if (!req.user && !originAllowed(bot.allowedOrigins, req.headers.origin)) {
      throw new ForbiddenException("This site is not allowed to use this bot");
    }

    const required = this.reflector.getAllAndOverride<BotFeature[] | undefined>(
      REQUIRED_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required?.some((feature) => !bot.features.includes(feature))) {
      throw new NotFoundException();
    }

    req.bot = bot;
    return true;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/** An empty list allows any origin; requests without an Origin (curl, server-side) pass. */
function originAllowed(allowed: string[], origin: string | undefined): boolean {
  return allowed.length === 0 || !origin || allowed.includes(origin);
}
