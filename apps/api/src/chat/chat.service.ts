import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ChatResponse, MessageRecord } from "@alturia/shared";
import { ConversationsService } from "../conversations/conversations.service";
import { EscalationsService } from "../escalations/escalations.service";
import { LLM_CHAT_PROVIDER, type LlmChatProvider } from "../llm/llm.interface";
import { PromptBuilderService } from "./prompt-builder.service";

const CHAT_TEMPERATURE = 0.4;
/** Messages of context sent to the LLM (the most recent ones). */
const HISTORY_LIMIT = 20;

// Keyword match, not confidence-based — that needs real RAG retrieval scores
// (see prompt-builder.service.ts).
const ESCALATION_KEYWORDS = [
  "asesor",
  "asesora",
  "humano",
  "persona real",
  "hablar con alguien",
  "queja",
  "reclamo",
];

const ESCALATION_REPLY =
  "Listo, ya avisé al equipo de Asis Altura y un asesor va a revisar tu caso pronto. " +
  "A partir de ahora un humano va a responderte por aquí mismo.";

const LLM_FALLBACK_REPLY =
  "Ahora mismo no puedo responder esa pregunta. Inténtalo de nuevo en un momento " +
  "o escribe «asesor» y una persona del equipo te ayuda.";

const reply = (
  text: string,
  flags: Partial<Omit<ChatResponse, "reply">> = {},
): ChatResponse => ({
  reply: text,
  lowConfidence: false,
  escalationOffered: false,
  awaitingHuman: false,
  ...flags,
});

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversations: ConversationsService,
    @Inject(LLM_CHAT_PROVIDER) private readonly llm: LlmChatProvider,
    private readonly promptBuilder: PromptBuilderService,
    private readonly escalations: EscalationsService,
  ) {}

  async handleMessage(
    sessionId: string,
    message: string,
  ): Promise<ChatResponse> {
    const conversation = await this.conversations.findOrCreate(sessionId);
    const history = await this.conversations.recentHistory(
      conversation.id,
      HISTORY_LIMIT,
    );
    await this.conversations.append(conversation.id, "USER", message);

    // A human advisor already has this case — don't talk over them. The
    // message is still saved (the admin sees it in the thread).
    if (conversation.status === "ESCALATED") {
      return reply("", { awaitingHuman: true });
    }

    if (matchesEscalationKeyword(message)) {
      await this.escalations.escalateConversation(conversation.id, message);
      await this.conversations.append(conversation.id, "BOT", ESCALATION_REPLY);
      return reply(ESCALATION_REPLY, { escalationOffered: true });
    }

    let answer: string;
    try {
      const result = await this.llm.chat({
        systemPrompt: await this.promptBuilder.buildSystemPrompt(),
        messages: [
          ...history.map((m) => ({
            role:
              m.role === "USER" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          })),
          { role: "user", content: message },
        ],
        temperature: CHAT_TEMPERATURE,
      });
      answer = result.content;
    } catch (error) {
      // The visitor gets a friendly way out instead of a 500.
      this.logger.error(
        `LLM failed for conversation ${conversation.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.conversations.append(
        conversation.id,
        "BOT",
        LLM_FALLBACK_REPLY,
      );
      return reply(LLM_FALLBACK_REPLY, { lowConfidence: true });
    }

    await this.conversations.append(conversation.id, "BOT", answer);
    return reply(answer);
  }

  /** Polled by the widget — returns [] for an unknown sessionId rather than erroring. */
  getMessages(sessionId: string): Promise<MessageRecord[]> {
    return this.conversations.listForSession(sessionId);
  }
}

function matchesEscalationKeyword(message: string): boolean {
  const normalized = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((kw) => normalized.includes(kw));
}
