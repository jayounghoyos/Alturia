import { Global, Module } from "@nestjs/common";
import { BotContextGuard } from "./bot-context.guard";
import { BotsController } from "./bots.controller";
import { BotsService } from "./bots.service";

@Global()
@Module({
  controllers: [BotsController],
  providers: [BotsService, BotContextGuard],
  exports: [BotsService, BotContextGuard],
})
export class BotsModule {}
