import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { EscalationsModule } from "../escalations/escalations.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PromptBuilderService } from "./prompt-builder.service";

@Module({
  imports: [LlmModule, EscalationsModule],
  controllers: [ChatController],
  providers: [ChatService, PromptBuilderService],
})
export class ChatModule {}
