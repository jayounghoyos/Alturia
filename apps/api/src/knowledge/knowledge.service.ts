import { Injectable, NotFoundException } from "@nestjs/common";
import {
  knowledgeContext,
  MAX_KNOWLEDGE_CONTEXT_CHARS,
  type CreateKnowledgeSourceInput,
  type KnowledgeSourceRecord,
} from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    botId: string,
    input: CreateKnowledgeSourceInput,
  ): Promise<KnowledgeSourceRecord> {
    const source = await this.prisma.knowledgeSource.create({
      data: {
        botId,
        type: "TEXT",
        title: input.title,
        content: input.content,
        status: "READY",
      },
    });
    return toRecord(source);
  }

  async list(botId: string): Promise<KnowledgeSourceRecord[]> {
    const sources = await this.prisma.knowledgeSource.findMany({
      where: { botId, status: "READY" },
      orderBy: { createdAt: "desc" },
    });
    return sources.map(toRecord);
  }

  async remove(botId: string, id: string): Promise<void> {
    const existing = await this.prisma.knowledgeSource.findFirst({
      where: { id, botId },
    });
    if (!existing) throw new NotFoundException("Knowledge source not found");
    await this.prisma.knowledgeSource.delete({ where: { id } });
  }

  /** The bot's active sources concatenated and truncated — consumed by PromptBuilderService. */
  async getActiveContext(botId: string): Promise<string | null> {
    const sources = await this.prisma.knowledgeSource.findMany({
      where: { botId, status: "READY" },
      orderBy: { createdAt: "asc" },
      select: { title: true, content: true },
    });
    if (sources.length === 0) return null;

    // Plain context stuffing (no chunking/embedding) only makes sense at this
    // scale; the cap keeps the prompt bounded. The dashboard shows usage.
    return knowledgeContext(
      sources.map((s) => ({ title: s.title, content: s.content ?? "" })),
    ).slice(0, MAX_KNOWLEDGE_CONTEXT_CHARS);
  }
}

function toRecord(source: {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
}): KnowledgeSourceRecord {
  return {
    id: source.id,
    title: source.title,
    content: source.content ?? "",
    createdAt: source.createdAt.toISOString(),
  };
}
