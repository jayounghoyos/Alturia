import { Injectable } from "@nestjs/common";
import type { AvailableSession, Course } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(): Promise<Course[]> {
    const courses = await this.prisma.course.findMany({ orderBy: { name: "asc" } });
    return courses.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  }

  /** Only sessions with open slots — a full session simply doesn't show up (mockup B2). */
  async listAvailability(courseId: string): Promise<AvailableSession[]> {
    const sessions = await this.prisma.courseSession.findMany({
      where: { courseId, availableSlots: { gt: 0 } },
      orderBy: { date: "asc" },
    });
    return sessions.map((s) => ({
      sessionId: s.id,
      date: s.date.toISOString().slice(0, 10),
      time: s.time,
      availableSlots: s.availableSlots,
      location: s.location,
    }));
  }
}
