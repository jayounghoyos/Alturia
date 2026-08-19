import { Injectable } from "@nestjs/common";
import type { CreateEscalationInput, EscalationRecord } from "@alturia/shared";
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
    return escalations.map((e) => ({
      id: e.id,
      reason: e.reason,
      status: e.status,
      contactInfo: (e.contactInfo as EscalationRecord["contactInfo"]) ?? null,
      createdAt: e.createdAt.toISOString(),
      conversationId: e.conversationId,
    }));
  }
}
