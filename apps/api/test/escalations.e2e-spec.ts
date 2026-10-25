import { randomUUID } from "node:crypto";
import {
  EscalationDetailSchema,
  EscalationRecordSchema,
  LoginResponseSchema,
  MessageRecordSchema,
} from "@alturia/shared";
import * as bcrypt from "bcryptjs";
import request from "supertest";
import { z } from "zod";
import { createE2eApp, type E2eContext } from "./utils/e2e-app";

describe("Admin login and escalation inbox (e2e)", () => {
  let ctx: E2eContext;
  const email = `admin-${randomUUID()}@e2e.test`;
  const password = "e2e-password";

  beforeAll(async () => {
    ctx = await createE2eApp();
    await ctx.prisma.adminUser.create({
      data: {
        email,
        name: "Admin e2e",
        passwordHash: await bcrypt.hash(password, 4),
      },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function loginToken(): Promise<string> {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);
    return LoginResponseSchema.parse(res.body).accessToken;
  }

  describe("POST /api/auth/login — admin authentication", () => {
    it("returns a JWT and the admin's name for valid credentials", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password })
        .expect(201);

      const body = LoginResponseSchema.parse(res.body);
      expect(body.accessToken.split(".")).toHaveLength(3);
      expect(body.admin).toEqual({ email, name: "Admin e2e" });
    });

    it("responds 401 with the same message for a wrong password and an unknown email", async () => {
      const wrongPassword = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password: "wrong" })
        .expect(401);
      const unknownEmail = await request(ctx.app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "nobody@e2e.test", password })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });
  });

  describe("Escalation lifecycle — widget → dashboard → widget (HU-15, HU-16, HU-17)", () => {
    it("rejects the admin inbox without a token (401)", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/escalations")
        .expect(401);
    });

    it("rejects the admin inbox with a forged token (401)", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/escalations")
        .set("Authorization", "Bearer not.a.real-token")
        .expect(401);
    });

    it("lets the visitor escalate, the admin reply and resolve, and the visitor read the reply", async () => {
      const server = ctx.app.getHttpServer();
      const token = await loginToken();
      const auth = { Authorization: `Bearer ${token}` };
      const sessionId = randomUUID();

      // 1. Visitor asks for a human from the widget (public endpoint).
      const created = await request(server)
        .post("/api/escalations")
        .send({ sessionId, reason: "Quiero hablar con un asesor" })
        .expect(201);
      const { id } = z.object({ id: z.string() }).parse(created.body);

      // 2. The case shows up in the admin inbox as OPEN.
      const inbox = await request(server)
        .get("/api/escalations")
        .set(auth)
        .expect(200);
      const open = z.array(EscalationRecordSchema).parse(inbox.body);
      expect(open.find((e) => e.id === id)?.status).toBe("OPEN");

      // 3. Admin replies → the case moves to IN_PROGRESS.
      await request(server)
        .post(`/api/escalations/${id}/reply`)
        .set(auth)
        .send({ content: "Hola, soy el asesor" })
        .expect(201);
      const detail = await request(server)
        .get(`/api/escalations/${id}`)
        .set(auth)
        .expect(200);
      expect(EscalationDetailSchema.parse(detail.body).escalation.status).toBe(
        "IN_PROGRESS",
      );

      // 4. The widget's polling endpoint now returns the ADMIN message.
      const thread = await request(server)
        .get(`/api/chat/${sessionId}/messages`)
        .expect(200);
      expect(z.array(MessageRecordSchema).parse(thread.body)).toEqual([
        expect.objectContaining({
          role: "ADMIN",
          content: "Hola, soy el asesor",
        }),
      ]);

      // 5. Resolving removes it from the inbox and closes the conversation.
      await request(server)
        .patch(`/api/escalations/${id}/resolve`)
        .set(auth)
        .expect(200);
      const after = await request(server)
        .get("/api/escalations")
        .set(auth)
        .expect(200);
      const remaining = z.array(EscalationRecordSchema).parse(after.body);
      expect(remaining.map((e) => e.id)).not.toContain(id);
      const conversation = await ctx.prisma.conversation.findUniqueOrThrow({
        where: { sessionId },
      });
      expect(conversation.status).toBe("CLOSED");
    });

    it("responds 404 when replying to an escalation that does not exist", async () => {
      const token = await loginToken();
      await request(ctx.app.getHttpServer())
        .post(`/api/escalations/${randomUUID()}/reply`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "Hola" })
        .expect(404);
    });
  });
});
