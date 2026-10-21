import { randomUUID } from "node:crypto";
import { ChatResponseSchema } from "@alturia/shared";
import request from "supertest";
import { createE2eApp, type E2eContext } from "./utils/e2e-app";

describe("Chat / FAQ with a fake LLM (e2e)", () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  beforeEach(() => {
    ctx.llmChat.mockClear();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const send = (sessionId: string, message: string) =>
    request(ctx.app.getHttpServer())
      .post("/api/chat")
      .send({ sessionId, message });

  describe("POST /api/chat — free-text questions (HU-14)", () => {
    it("answers through the LLM and stores both the USER and BOT messages", async () => {
      const sessionId = randomUUID();

      const res = await send(sessionId, "¿Qué documentos necesito?").expect(
        201,
      );

      expect(ChatResponseSchema.parse(res.body)).toMatchObject({
        reply: "Respuesta del LLM falso",
        escalationOffered: false,
        awaitingHuman: false,
      });
      expect(ctx.llmChat).toHaveBeenCalledTimes(1);
      const messages = await ctx.prisma.message.findMany({
        where: { conversation: { sessionId } },
        orderBy: { createdAt: "asc" },
      });
      expect(messages.map((m) => m.role)).toEqual(["USER", "BOT"]);
    });

    it("responds 400 when the sessionId is not a UUID", async () => {
      await send("not-a-uuid", "Hola").expect(400);
      expect(ctx.llmChat).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/chat — handoff to a human (HU-15, HU-17)", () => {
    it("escalates on keywords like 'asesor' without calling the LLM", async () => {
      const sessionId = randomUUID();

      const res = await send(sessionId, "Quiero hablar con un asesor").expect(
        201,
      );

      expect(ChatResponseSchema.parse(res.body).escalationOffered).toBe(true);
      expect(ctx.llmChat).not.toHaveBeenCalled();
      const escalations = await ctx.prisma.escalation.count({
        where: { conversation: { sessionId } },
      });
      expect(escalations).toBe(1);
    });

    it("stays quiet (awaitingHuman) while a human advisor has the case", async () => {
      const sessionId = randomUUID();
      await send(sessionId, "Necesito un asesor").expect(201);

      const res = await send(sessionId, "¿Sigue ahí?").expect(201);

      expect(ChatResponseSchema.parse(res.body)).toMatchObject({
        reply: "",
        awaitingHuman: true,
      });
      expect(ctx.llmChat).not.toHaveBeenCalled();
    });
  });
});
