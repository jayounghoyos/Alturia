import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { EscalationsController } from "./escalations.controller";
import { EscalationsService } from "./escalations.service";

@Module({
  imports: [ConversationsModule],
  controllers: [EscalationsController],
  providers: [EscalationsService],
  exports: [EscalationsService],
})
export class EscalationsModule {}
