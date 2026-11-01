import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateEscalationInput,
  EscalationDetail,
  EscalationRecord,
  MessageRecord,
} from "@alturia/shared";
import type { Escalation, Prisma } from "@prisma/client";
import {
  ConversationsService,
  toMessageRecord,
} from "../conversations/conversations.service";
import { PrismaService } from "../prisma/prisma.service";

/** Every admin-facing method takes the admin's botId: one bot never sees another's cases. */
@Injectable()
export class EscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  /** Widget's "talk to a human" button: escalates the visitor's conversation. */
  async create(
    botId: string,
    input: CreateEscalationInput,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const conversation = await this.conversations.markEscalated(
        botId,
        input.sessionId,
        tx,
      );
      const escalation = await tx.escalation.create({
        data: {
          conversationId: conversation.id,
          reason: input.reason,
          contactInfo: input.contact ?? undefined,
        },
      });
      return { id: escalation.id };
    });
  }

  /** Chat keyword escalation: the conversation already exists and is the bot's. */
  async escalateConversation(
    conversationId: string,
    reason: string,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: { status: "ESCALATED" },
      });
      const escalation = await tx.escalation.create({
        data: { conversationId, reason },
      });
      return { id: escalation.id };
    });
  }

  /** Powers the dashboard inbox — open/in-progress cases only, newest first. */
  async listOpen(botId: string): Promise<EscalationRecord[]> {
    const escalations = await this.prisma.escalation.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        conversation: { botId },
      },
      orderBy: { createdAt: "desc" },
    });
    return escalations.map(toRecord);
  }

  /** Full thread for one case — the admin's "open this chat" view. */
  async getDetail(botId: string, id: string): Promise<EscalationDetail> {
    const escalation = await this.findOrThrow(botId, id, {
      conversation: { select: { sessionId: true } },
    });
    return {
      escalation: toRecord(escalation),
      sessionId: escalation.conversation.sessionId,
      messages: await this.conversations.listForConversation(
        escalation.conversationId,
      ),
    };
  }

  /** Admin sends a message into the conversation — bumps OPEN -> IN_PROGRESS automatically. */
  async reply(
    botId: string,
    id: string,
    content: string,
  ): Promise<MessageRecord> {
    const escalation = await this.findOrThrow(botId, id);
    const message = await this.prisma.$transaction(async (tx) => {
      if (escalation.status === "OPEN") {
        await tx.escalation.update({
          where: { id },
          data: { status: "IN_PROGRESS" },
        });
      }
      return this.conversations.append(
        escalation.conversationId,
        "ADMIN",
        content,
        tx,
      );
    });
    return toMessageRecord(message);
  }

  /** Closes the case; the bot takes over again if the visitor writes later. */
  async resolve(botId: string, id: string): Promise<void> {
    const escalation = await this.findOrThrow(botId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.escalation.update({
        where: { id },
        data: { status: "RESOLVED" },
      });
      await this.conversations.close(escalation.conversationId, tx);
    });
  }

  /** Another bot's escalation is reported as missing, not as forbidden. */
  private async findOrThrow<I extends Prisma.EscalationInclude>(
    botId: string,
    id: string,
    include?: I,
  ): Promise<Prisma.EscalationGetPayload<{ include: I }>> {
    const escalation = await this.prisma.escalation.findFirst({
      where: { id, conversation: { botId } },
      include,
    });
    if (!escalation) throw new NotFoundException("Escalation not found");
    return escalation as Prisma.EscalationGetPayload<{ include: I }>;
  }
}

function toRecord(e: Escalation): EscalationRecord {
  return {
    id: e.id,
    reason: e.reason,
    status: e.status,
    contactInfo: (e.contactInfo as EscalationRecord["contactInfo"]) ?? null,
    createdAt: e.createdAt.toISOString(),
    conversationId: e.conversationId,
  };
}
