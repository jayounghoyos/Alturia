import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { LlmModule } from "../llm/llm.module";
import { EscalationsModule } from "../escalations/escalations.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PromptBuilderService } from "./prompt-builder.service";

@Module({
  imports: [ConversationsModule, LlmModule, EscalationsModule, KnowledgeModule],
  controllers: [ChatController],
  providers: [ChatService, PromptBuilderService],
})
export class ChatModule {}
