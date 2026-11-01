import { Global, Module } from "@nestjs/common";
import { BotAdminController } from "./bot-admin.controller";
import { BotAvatarController } from "./bot-avatar.controller";
import { BotContextGuard } from "./bot-context.guard";
import { BotSettingsService } from "./bot-settings.service";
import { BotsController } from "./bots.controller";
import { BotsService } from "./bots.service";

@Global()
@Module({
  controllers: [BotsController, BotAdminController, BotAvatarController],
  providers: [BotsService, BotSettingsService, BotContextGuard],
  exports: [BotsService, BotContextGuard],
})
export class BotsModule {}
