import { Injectable } from "@nestjs/common";
import type { MessageRecord } from "@alturia/shared";
import type { Conversation, Message, MsgRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** A Prisma client or an interactive-transaction client. */
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Single owner of Conversation and Message rows. Chat, escalations and the
 * widget's polling all go through here, so the rules (reopen a closed
 * conversation, history order, record shape) live in one place.
 */
@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The visitor's conversation, created on first contact. A conversation an
   * advisor already resolved (CLOSED) reopens when the visitor writes again,
   * so the bot answers instead of writing into a closed thread.
   */
  async findOrCreate(sessionId: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
    });
    if (conversation.status !== "CLOSED") return conversation;
    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN" },
    });
  }

  /** Marks the visitor's conversation as handed to a human, creating it if needed. */
  markEscalated(
    sessionId: string,
    db: Db = this.prisma,
  ): Promise<Conversation> {
    return db.conversation.upsert({
      where: { sessionId },
      update: { status: "ESCALATED" },
      create: { sessionId, status: "ESCALATED" },
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
  async listForSession(sessionId: string): Promise<MessageRecord[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversation: { sessionId } },
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
