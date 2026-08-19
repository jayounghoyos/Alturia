import { Inject, Injectable } from "@nestjs/common";
import type { ChatResponse } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LLM_CHAT_PROVIDER, type LlmChatProvider } from "../llm/llm.interface";
import { PromptBuilderService } from "./prompt-builder.service";
import { EscalationsService } from "../escalations/escalations.service";

const CHAT_TEMPERATURE = 0.4;
const HISTORY_LIMIT = 20;

// Keyword match, not confidence-based — that needs real RAG retrieval scores
// (see prompt-builder.service.ts). Good enough to demo the D1 mockup flow.
const ESCALATION_KEYWORDS = [
  "asesor",
  "asesora",
  "humano",
  "persona real",
  "hablar con alguien",
  "queja",
  "reclamo",
];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_CHAT_PROVIDER) private readonly llm: LlmChatProvider,
    private readonly promptBuilder: PromptBuilderService,
    private readonly escalations: EscalationsService,
  ) {}

  async handleMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const conversation = await this.prisma.conversation.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: HISTORY_LIMIT } },
    });

    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: "USER", content: message },
    });

    if (matchesEscalationKeyword(message)) {
      return this.handleEscalation(conversation.id, sessionId, message);
    }

    const history = conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

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

  private async handleEscalation(
    conversationId: string,
    sessionId: string,
    triggerMessage: string,
  ): Promise<ChatResponse> {
    await this.escalations.create({ sessionId, reason: triggerMessage });

    const reply =
      "Listo, ya avisé al equipo de Asis Altura y un asesor va a revisar tu caso pronto. " +
      "Si quieres, mientras tanto puedes seguir contándome más detalles.";

    await this.prisma.message.create({
      data: { conversationId, role: "BOT", content: reply },
    });

    return { reply, lowConfidence: false, escalationOffered: true };
  }
}

function matchesEscalationKeyword(message: string): boolean {
  const normalized = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((kw) => normalized.includes(kw));
}
