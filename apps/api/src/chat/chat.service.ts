import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ChatResponse, MessageRecord } from "@alturia/shared";
import type { ResolvedBot } from "../bots/bot.types";
import { ConversationsService } from "../conversations/conversations.service";
import { EscalationsService } from "../escalations/escalations.service";
import { LLM_CHAT_PROVIDER, type LlmChatProvider } from "../llm/llm.interface";
import { PromptBuilderService } from "./prompt-builder.service";

const CHAT_TEMPERATURE = 0.4;
/** Messages of context sent to the LLM (the most recent ones). */
const HISTORY_LIMIT = 20;

const LLM_FALLBACK_REPLY =
  "Ahora mismo no puedo responder esa pregunta. Inténtalo de nuevo en un momento.";
const LLM_FALLBACK_HANDOFF_HINT =
  " Si prefieres, escribe «asesor» y una persona del equipo te ayuda.";

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
    bot: ResolvedBot,
    sessionId: string,
    message: string,
  ): Promise<ChatResponse> {
    const conversation = await this.conversations.findOrCreate(
      bot.id,
      sessionId,
    );
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

    // Keyword match, not confidence-based — that needs real RAG retrieval
    // scores (see prompt-builder.service.ts).
    const handoff = bot.features.includes("HUMAN_HANDOFF");
    if (handoff && matchesKeyword(message, bot.escalationKeywords)) {
      await this.escalations.escalateConversation(conversation.id, message);
      await this.conversations.append(
        conversation.id,
        "BOT",
        bot.escalationReply,
      );
      return reply(bot.escalationReply, { escalationOffered: true });
    }

    let answer: string;
    try {
      const result = await this.llm.chat({
        systemPrompt: await this.promptBuilder.buildSystemPrompt(bot),
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
      const fallback = handoff
        ? LLM_FALLBACK_REPLY + LLM_FALLBACK_HANDOFF_HINT
        : LLM_FALLBACK_REPLY;
      await this.conversations.append(conversation.id, "BOT", fallback);
      return reply(fallback, { lowConfidence: true });
    }

    await this.conversations.append(conversation.id, "BOT", answer);
    return reply(answer);
  }

  /** Polled by the widget — returns [] for an unknown sessionId rather than erroring. */
  getMessages(botId: string, sessionId: string): Promise<MessageRecord[]> {
    return this.conversations.listForSession(botId, sessionId);
  }
}

function matchesKeyword(message: string, keywords: string[]): boolean {
  const normalized = message.toLowerCase();
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}
