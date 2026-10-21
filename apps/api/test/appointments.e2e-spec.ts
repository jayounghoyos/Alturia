import { randomUUID } from "node:crypto";
import { AppointmentConfirmationSchema } from "@alturia/shared";
import request from "supertest";
import {
  createCourse,
  createE2eApp,
  daysFromNow,
  randomNationalId,
  type E2eContext,
} from "./utils/e2e-app";

describe("Course availability and booking (e2e)", () => {
  let ctx: E2eContext;
  let courseId: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    courseId = (await createCourse(ctx.prisma)).id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  function createSession(availableSlots: number) {
    return ctx.prisma.courseSession.create({
      data: {
        id: `session-${randomUUID()}`,
        courseId,
        date: daysFromNow(7),
        time: "08:00",
        availableSlots,
        location: "Sede e2e",
      },
    });
  }

  function book(sessionId: string, overrides: Record<string, unknown> = {}) {
    return request(ctx.app.getHttpServer())
      .post("/api/appointments")
      .send({
        sessionId,
        nationalId: randomNationalId(),
        name: "Trabajador e2e",
        phone: "3001234567",
        dataConsent: true,
        ...overrides,
      });
  }

  describe("GET /api/courses/:id/availability — available sessions (HU-06)", () => {
    it("lists only sessions that still have open slots", async () => {
      const open = await createSession(3);
      const full = await createSession(0);

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/courses/${courseId}/availability`)
        .expect(200);

      const ids = (res.body as { sessionId: string }[]).map((s) => s.sessionId);
      expect(ids).toContain(open.id);
      expect(ids).not.toContain(full.id);
    });
  });

  describe("POST /api/appointments — book a session (HU-07, HU-08)", () => {
    it("confirms the booking with an ALT-XXXXXX code and takes one slot", async () => {
      const session = await createSession(2);

      const res = await book(session.id).expect(201);

      const confirmation = AppointmentConfirmationSchema.parse(res.body);
      expect(confirmation.confirmationCode).toMatch(/^ALT-[A-HJ-NP-Z2-9]{6}$/);
      expect(confirmation).toMatchObject({
        location: "Sede e2e",
        time: "08:00",
        status: "CONFIRMED",
      });
      const after = await ctx.prisma.courseSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(after.availableSlots).toBe(1);
    });

    it("gives the last slot to only one of two simultaneous bookings (the other gets 409)", async () => {
      const session = await createSession(1);

      const results = await Promise.all([book(session.id), book(session.id)]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      const after = await ctx.prisma.courseSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(after.availableSlots).toBe(0);
    });

    it("responds 404 when the session does not exist", async () => {
      await book(`session-${randomUUID()}`).expect(404);
    });

    it("responds 400 and books nothing without explicit data consent (Ley 1581)", async () => {
      const session = await createSession(2);

      await book(session.id, { dataConsent: false }).expect(400);

      const after = await ctx.prisma.courseSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(after.availableSlots).toBe(2);
    });
  });
});
