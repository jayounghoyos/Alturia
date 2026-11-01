import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthUser } from "../bots/bot.types";
import type { Env } from "../config/env.schema";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
}

/** An admin's bot never changes in practice; cache it to skip a query per request. */
const BOT_CACHE_TTL_MS = 60_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly botByAdmin = new Map<
    string,
    { botId: string; expiresAt: number }
  >();

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET", { infer: true }),
    });
  }

  /**
   * Attached to req.user. The bot is looked up rather than read from the
   * token, so tokens issued before bots existed keep working.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const cached = this.botByAdmin.get(payload.sub);
    if (cached && cached.expiresAt > Date.now()) {
      return { id: payload.sub, email: payload.email, botId: cached.botId };
    }
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { botId: true },
    });
    if (!admin) throw new UnauthorizedException();
    this.botByAdmin.set(payload.sub, {
      botId: admin.botId,
      expiresAt: Date.now() + BOT_CACHE_TTL_MS,
    });
    return { id: payload.sub, email: payload.email, botId: admin.botId };
  }
}
