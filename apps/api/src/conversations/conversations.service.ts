import { ConflictException, Injectable } from "@nestjs/common";
import type { MessageRecord } from "@alturia/shared";
import type { Conversation, Message, MsgRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** A Prisma client or an interactive-transaction client. */
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Single owner of Conversation and Message rows. Chat, escalations and the
 * widget's polling all go through here, so the rules (bot ownership, reopen a
 * closed conversation, history order, record shape) live in one place.
 */
@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The visitor's conversation with this bot, created on first contact. A
   * conversation an advisor already resolved (CLOSED) reopens when the visitor
   * writes again, so the bot answers instead of writing into a closed thread.
   */
  async findOrCreate(botId: string, sessionId: string): Promise<Conversation> {
    const conversation = assertOwnedBy(
      botId,
      await this.prisma.conversation.upsert({
        where: { sessionId },
        update: {},
        create: { sessionId, botId },
      }),
    );
    if (conversation.status !== "CLOSED") return conversation;
    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN" },
    });
  }

  /** Marks the visitor's conversation as handed to a human, creating it if needed. */
  async markEscalated(
    botId: string,
    sessionId: string,
    db: Db = this.prisma,
  ): Promise<Conversation> {
    const existing = await db.conversation.findUnique({ where: { sessionId } });
    if (!existing) {
      return db.conversation.create({
        data: { sessionId, botId, status: "ESCALATED" },
      });
    }
    assertOwnedBy(botId, existing);
    return db.conversation.update({
      where: { id: existing.id },
      data: { status: "ESCALATED" },
    });
  }

  close(conversationId: string, db: Db = this.prisma): Promise<Conversation> {
    return db.conversation.update({
      where: { id: conversationId },
      data: { status: "CLOSED" },
    });
  }

  append(
    conversationId: string,
    role: MsgRole,
    content: string,
    db: Db = this.prisma,
  ): Promise<Message> {
    return db.message.create({ data: { conversationId, role, content } });
  }

  /** The latest `limit` messages, oldest first — the window sent to the LLM. */
  async recentHistory(
    conversationId: string,
    limit: number,
  ): Promise<Message[]> {
    const latest = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return latest.reverse();
  }

  /** Full thread for the widget's polling; [] for an unknown session. */
  async listForSession(
    botId: string,
    sessionId: string,
  ): Promise<MessageRecord[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversation: { sessionId, botId } },
      orderBy: { createdAt: "asc" },
    });
    return messages.map(toMessageRecord);
  }

  async listForConversation(conversationId: string): Promise<MessageRecord[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return messages.map(toMessageRecord);
  }
}

export function toMessageRecord(m: Message): MessageRecord {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Session ids are random v4 UUIDs, one per bot per browser, so a clash means
 * a client bug or someone probing — one bot never continues another's chat.
 */
function assertOwnedBy(
  botId: string,
  conversation: Conversation,
): Conversation {
  if (conversation.botId !== botId) {
    throw new ConflictException("This session belongs to another bot");
  }
  return conversation;
}
