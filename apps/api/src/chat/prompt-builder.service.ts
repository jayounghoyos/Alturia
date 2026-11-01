import { Injectable } from "@nestjs/common";
import type { Bot } from "@prisma/client";
import { KnowledgeService } from "../knowledge/knowledge.service";

/**
 * The system prompt is the bot's persona plus whatever its team uploaded.
 *
 * Plain context-stuffing, not real RAG: uploaded documents are appended whole
 * (truncated, see KnowledgeService.MAX_CONTEXT_CHARS) instead of being
 * chunked/embedded and retrieved by similarity. Good enough for one or two
 * short documents; swap for pgvector retrieval (schema already supports it)
 * if that stops being true.
 */
@Injectable()
export class PromptBuilderService {
  constructor(private readonly knowledge: KnowledgeService) {}

  async buildSystemPrompt(bot: Pick<Bot, "id" | "name" | "persona">) {
    const uploadedContext = await this.knowledge.getActiveContext(bot.id);
    if (!uploadedContext) return bot.persona;

    return `${bot.persona}

Además, el equipo de ${bot.name} subió este contexto adicional — dale prioridad sobre lo anterior si hay conflicto, y sigue sin inventar nada que no esté aquí ni en lo de arriba:

${uploadedContext}`;
  }
}
