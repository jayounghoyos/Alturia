import { Controller, Get, Param, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/public.decorator";
import { BotSettingsService } from "./bot-settings.service";

/** Public — the widget's <img>. The URL carries ?v=<version>, so it can be cached forever. */
@Public()
@Controller("api/bots")
export class BotAvatarController {
  constructor(private readonly settings: BotSettingsService) {}

  @Get(":publicKey/avatar")
  async avatar(
    @Param("publicKey") publicKey: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { bytes, mime } = await this.settings.getAvatar(publicKey);
    res.set({
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return new StreamableFile(bytes, { type: mime });
  }
}
