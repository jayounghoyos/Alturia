import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateKnowledgeSourceInput,
  KnowledgeSourceRecord,
} from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

// Keeps the system prompt from growing unbounded if several documents get
// uploaded — plain context-stuffing (no chunking/embedding) only makes sense
// at this scale anyway. Bump this (or move to real RAG) if it's ever too tight.
const MAX_CONTEXT_CHARS = 6000;

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

    const combined = sources
      .map((s) => `### ${s.title}\n${s.content ?? ""}`)
      .join("\n\n")
      .slice(0, MAX_CONTEXT_CHARS);
    return combined;
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
