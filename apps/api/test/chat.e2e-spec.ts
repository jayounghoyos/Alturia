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

    it("sends the LLM the latest 20 messages as history, oldest first", async () => {
      const sessionId = randomUUID();
      const conversation = await ctx.prisma.conversation.create({
        data: { sessionId },
      });
      const start = Date.now() - 60_000;
      await ctx.prisma.message.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          conversationId: conversation.id,
          role: i % 2 === 0 ? ("USER" as const) : ("BOT" as const),
          content: `mensaje ${i}`,
          createdAt: new Date(start + i * 1000),
        })),
      });

      await send(sessionId, "¿Y ahora?").expect(201);

      const [{ messages }] = ctx.llmChat.mock.calls[0];
      expect(messages).toHaveLength(21);
      expect(messages[0].content).toBe("mensaje 5");
      expect(messages[19].content).toBe("mensaje 24");
      expect(messages[20]).toEqual({ role: "user", content: "¿Y ahora?" });
    });

    it("answers with a friendly fallback (not a 500) when the LLM fails", async () => {
      const sessionId = randomUUID();
      ctx.llmChat.mockRejectedValueOnce(new Error("model deprecated"));

      const res = await send(sessionId, "¿Cuánto dura el curso?").expect(201);

      const body = ChatResponseSchema.parse(res.body);
      expect(body.lowConfidence).toBe(true);
      expect(body.reply).toMatch(/asesor/);
      const stored = await ctx.prisma.message.findMany({
        where: { conversation: { sessionId } },
        orderBy: { createdAt: "asc" },
      });
      expect(stored.map((m) => m.role)).toEqual(["USER", "BOT"]);
    });

    it("reopens a conversation an advisor resolved, and the bot answers again", async () => {
      const sessionId = randomUUID();
      await ctx.prisma.conversation.create({
        data: { sessionId, status: "CLOSED" },
      });

      const res = await send(sessionId, "Otra pregunta").expect(201);

      expect(ChatResponseSchema.parse(res.body).awaitingHuman).toBe(false);
      expect(ctx.llmChat).toHaveBeenCalledTimes(1);
      const conversation = await ctx.prisma.conversation.findUniqueOrThrow({
        where: { sessionId },
      });
      expect(conversation.status).toBe("OPEN");
    });
  });

  describe("GET /api/chat/:sessionId/messages — widget polling", () => {
    it("responds 400 when the sessionId is not a UUID", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/chat/not-a-uuid/messages")
        .expect(400);
    });

    it("returns [] for a session that never wrote", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/chat/${randomUUID()}/messages`)
        .expect(200);
      expect(res.body).toEqual([]);
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
