import { Inject, Injectable } from "@nestjs/common";
import type { ChatResponse } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LLM_CHAT_PROVIDER, type LlmChatProvider } from "../llm/llm.interface";
import { PromptBuilderService } from "./prompt-builder.service";

const CHAT_TEMPERATURE = 0.4;
const HISTORY_LIMIT = 20;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_CHAT_PROVIDER) private readonly llm: LlmChatProvider,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async handleMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const conversation = await this.prisma.conversation.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: HISTORY_LIMIT } },
    });

    const history = conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: "USER", content: message },
    });

    const result = await this.llm.chat({
      systemPrompt: this.promptBuilder.buildSystemPrompt(),
      messages: [...history, { role: "user", content: message }],
      temperature: CHAT_TEMPERATURE,
    });

    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: "BOT", content: result.content },
    });

    // No retrieval yet, so there's no real confidence score to threshold on —
    // both flags stay false until the RAG pipeline lands (see prompt-builder.service.ts).
    return { reply: result.content, lowConfidence: false, escalationOffered: false };
  }
}
