import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateEscalationInput,
  EscalationDetail,
  EscalationRecord,
  MessageRecord,
} from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EscalationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEscalationInput): Promise<{ id: string }> {
    const conversation = await this.prisma.conversation.upsert({
      where: { sessionId: input.sessionId },
      update: { status: "ESCALATED" },
      create: { sessionId: input.sessionId, status: "ESCALATED" },
    });

    const escalation = await this.prisma.escalation.create({
      data: {
        conversationId: conversation.id,
        reason: input.reason,
        contactInfo: input.contact ?? undefined,
      },
    });
    return { id: escalation.id };
  }

  /** Powers the dashboard inbox — open/in-progress cases only, newest first. */
  async listOpen(): Promise<EscalationRecord[]> {
    const escalations = await this.prisma.escalation.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
    });
    return escalations.map(toRecord);
  }

  /** Full thread for one case — the admin's "open this chat" view. */
  async getDetail(id: string): Promise<EscalationDetail> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!escalation) throw new NotFoundException("Escalation not found");

    return {
      escalation: toRecord(escalation),
      sessionId: escalation.conversation.sessionId,
      messages: escalation.conversation.messages.map(toMessageRecord),
    };
  }

  /** Admin sends a message into the conversation — bumps OPEN -> IN_PROGRESS automatically. */
  async reply(id: string, content: string): Promise<MessageRecord> {
    const escalation = await this.prisma.escalation.findUnique({ where: { id } });
    if (!escalation) throw new NotFoundException("Escalation not found");

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: escalation.conversationId, role: "ADMIN", content },
      }),
      this.prisma.escalation.update({
        where: { id },
        data: escalation.status === "OPEN" ? { status: "IN_PROGRESS" } : {},
      }),
    ]);
    return toMessageRecord(message);
  }

  async resolve(id: string): Promise<void> {
    const escalation = await this.prisma.escalation.findUnique({ where: { id } });
    if (!escalation) throw new NotFoundException("Escalation not found");

    await this.prisma.$transaction([
      this.prisma.escalation.update({ where: { id }, data: { status: "RESOLVED" } }),
      this.prisma.conversation.update({
        where: { id: escalation.conversationId },
        data: { status: "CLOSED" },
      }),
    ]);
  }
}

function toRecord(e: {
  id: string;
  reason: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  contactInfo: unknown;
  createdAt: Date;
  conversationId: string;
}): EscalationRecord {
  return {
    id: e.id,
    reason: e.reason,
    status: e.status,
    contactInfo: (e.contactInfo as EscalationRecord["contactInfo"]) ?? null,
    createdAt: e.createdAt.toISOString(),
    conversationId: e.conversationId,
  };
}

function toMessageRecord(m: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}): MessageRecord {
  return {
    id: m.id,
    role: m.role as MessageRecord["role"],
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}
