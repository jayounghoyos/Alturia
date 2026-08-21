import { randomInt } from "node:crypto";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { AppointmentConfirmation, CreateAppointmentInput } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentConfirmation> {
    return this.prisma.$transaction(async (tx) => {
      // Atomic decrement guarded by availableSlots > 0 — updateMany's `count`
      // tells us whether we actually won a slot, closing the race where two
      // people book the last spot at the same time.
      const decremented = await tx.courseSession.updateMany({
        where: { id: input.sessionId, availableSlots: { gt: 0 } },
        data: { availableSlots: { decrement: 1 } },
      });
      if (decremented.count === 0) {
        const exists = await tx.courseSession.findUnique({ where: { id: input.sessionId } });
        if (!exists) throw new NotFoundException("Course session not found");
        throw new ConflictException("No available slots for this session");
      }

      const session = await tx.courseSession.findUniqueOrThrow({
        where: { id: input.sessionId },
        include: { course: true },
      });

      const worker = await tx.worker.upsert({
        where: { nationalId: input.nationalId },
        update: { name: input.name, phone: input.phone },
        create: { nationalId: input.nationalId, name: input.name, phone: input.phone },
      });

      const confirmationCode = generateConfirmationCode();
      await tx.appointment.create({
        data: {
          confirmationCode,
          workerId: worker.id,
          courseSessionId: session.id,
        },
      });

      return {
        confirmationCode,
        courseName: session.course.name,
        date: session.date.toISOString().slice(0, 10),
        time: session.time,
        location: session.location,
        status: "CONFIRMED" as const,
      };
    });
  }
}

function generateConfirmationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids misread digits
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)];
  return `ALT-${code}`;
}
