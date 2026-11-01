import { randomUUID } from "node:crypto";
import { BotConfigSchema, ChatResponseSchema } from "@alturia/shared";
import type { Bot } from "@prisma/client";
import request from "supertest";
import { z } from "zod";
import {
  BOT_HEADER,
  createAdminToken,
  createBot,
  createE2eApp,
  type E2eContext,
} from "./utils/e2e-app";

describe("One platform, many client bots (e2e)", () => {
  let ctx: E2eContext;
  let clientBot: Bot;

  beforeAll(async () => {
    ctx = await createE2eApp();
    clientBot = await createBot(ctx.prisma);
  });

  beforeEach(() => {
    ctx.llmChat.mockClear();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const server = () => ctx.app.getHttpServer();

  describe("GET /api/bot-config — which bot the widget is", () => {
    it("serves Asis Altura's bot when the embed sends no bot key (old embeds keep working)", async () => {
      const res = await request(server()).get("/api/bot-config").expect(200);

      const config = BotConfigSchema.parse(res.body);
      expect(config.name).toBe("Asis Altura");
      expect(config.theme.primaryColor).toBe("#0180E1");
      expect(config.features).toEqual(
        expect.arrayContaining(["CERTIFICATES", "QR", "APPOINTMENTS"]),
      );
    });

    it("serves the client's own brand and features for its public key", async () => {
      const res = await request(server())
        .get("/api/bot-config")
        .set(BOT_HEADER, clientBot.publicKey)
        .expect(200);

      expect(BotConfigSchema.parse(res.body)).toMatchObject({
        name: clientBot.name,
        greeting: "Hola desde el bot e2e",
        theme: { primaryColor: "#123456", position: "bottom-left" },
        avatarUrl: null,
        features: ["FAQ", "HUMAN_HANDOFF"],
        faqQuickQuestions: ["¿Pregunta e2e?"],
        handoffMessage: "Un asesor del bot e2e te escribe pronto.",
      });
    });

    it("responds 404 for a public key that does not exist", async () => {
      await request(server())
        .get("/api/bot-config")
        .set(BOT_HEADER, "pk_does_not_exist")
        .expect(404);
    });
  });

  describe("Features — a bot only exposes what it has enabled", () => {
    it("hides Asis Altura's certificates and courses from a bot without them (404)", async () => {
      await request(server())
        .get("/api/certificates/1036482117")
        .set(BOT_HEADER, clientBot.publicKey)
        .expect(404);
      await request(server())
        .post("/api/certificates/qr")
        .set(BOT_HEADER, clientBot.publicKey)
        .send({ payload: "demo-worker1-course" })
        .expect(404);
      await request(server())
        .get("/api/courses")
        .set(BOT_HEADER, clientBot.publicKey)
        .expect(404);
      await request(server()).get("/api/courses").expect(200);
    });

    it("does not escalate on keywords when human handoff is off", async () => {
      const noHandoff = await createBot(ctx.prisma, { features: ["FAQ"] });
      const sessionId = randomUUID();

      const res = await request(server())
        .post("/api/chat")
        .set(BOT_HEADER, noHandoff.publicKey)
        .send({ sessionId, message: "Quiero un asesor" })
        .expect(201);

      expect(ChatResponseSchema.parse(res.body).escalationOffered).toBe(false);
      expect(ctx.llmChat).toHaveBeenCalledTimes(1);
      await request(server())
        .post("/api/escalations")
        .set(BOT_HEADER, noHandoff.publicKey)
        .send({ sessionId, reason: "Botón de asesor" })
        .expect(404);
      expect(
        await ctx.prisma.escalation.count({
          where: { conversation: { sessionId } },
        }),
      ).toBe(0);
    });
  });

  describe("Chat — each bot speaks as itself", () => {
    it("uses the bot's persona and its own knowledge base, never another bot's", async () => {
      const otherBot = await createBot(ctx.prisma);
      await ctx.prisma.knowledgeSource.create({
        data: {
          botId: otherBot.id,
          type: "TEXT",
          status: "READY",
          title: "Secreto",
          content: "Dato privado del otro cliente",
        },
      });

      await request(server())
        .post("/api/chat")
        .set(BOT_HEADER, clientBot.publicKey)
        .send({ sessionId: randomUUID(), message: "Hola" })
        .expect(201);

      const [{ systemPrompt }] = ctx.llmChat.mock.calls[0];
      expect(systemPrompt.startsWith(clientBot.persona)).toBe(true);
      expect(systemPrompt).not.toContain("Dato privado del otro cliente");
    });

    it("answers handoff with the bot's own message", async () => {
      const res = await request(server())
        .post("/api/chat")
        .set(BOT_HEADER, clientBot.publicKey)
        .send({ sessionId: randomUUID(), message: "Necesito un asesor" })
        .expect(201);

      expect(ChatResponseSchema.parse(res.body)).toMatchObject({
        reply: "Un asesor del bot e2e te escribe pronto.",
        escalationOffered: true,
      });
    });

    it("never lets one bot continue another bot's conversation", async () => {
      const sessionId = randomUUID();
      await request(server())
        .post("/api/chat")
        .send({ sessionId, message: "Hola Asis" })
        .expect(201);

      await request(server())
        .post("/api/chat")
        .set(BOT_HEADER, clientBot.publicKey)
        .send({ sessionId, message: "Hola" })
        .expect(409);
      const thread = await request(server())
        .get(`/api/chat/${sessionId}/messages`)
        .set(BOT_HEADER, clientBot.publicKey)
        .expect(200);
      expect(thread.body).toEqual([]);
    });
  });

  describe("Dashboard — an admin only sees their own bot", () => {
    it("isolates escalations: another bot's case is invisible and untouchable", async () => {
      const sessionId = randomUUID();
      const created = await request(server())
        .post("/api/escalations")
        .send({ sessionId, reason: "Caso de Asis Altura" })
        .expect(201);
      const { id } = z.object({ id: z.string() }).parse(created.body);
      const clientAdmin = {
        Authorization: `Bearer ${await createAdminToken(ctx, clientBot.id)}`,
      };

      const inbox = await request(server())
        .get("/api/escalations")
        .set(clientAdmin)
        .expect(200);
      expect(
        z
          .array(z.object({ id: z.string() }))
          .parse(inbox.body)
          .map((e) => e.id),
      ).not.toContain(id);
      await request(server())
        .get(`/api/escalations/${id}`)
        .set(clientAdmin)
        .expect(404);
      await request(server())
        .post(`/api/escalations/${id}/reply`)
        .set(clientAdmin)
        .send({ content: "No debería llegar" })
        .expect(404);
      await request(server())
        .patch(`/api/escalations/${id}/resolve`)
        .set(clientAdmin)
        .expect(404);

      const asisAdmin = {
        Authorization: `Bearer ${await createAdminToken(ctx)}`,
      };
      await request(server())
        .get(`/api/escalations/${id}`)
        .set(asisAdmin)
        .expect(200);
    });

    it("isolates the knowledge base: lists and deletes stay inside the admin's bot", async () => {
      const asisDoc = await ctx.prisma.knowledgeSource.create({
        data: {
          type: "TEXT",
          status: "READY",
          title: "Doc de Asis",
          content: "Solo para Asis Altura",
        },
      });
      const clientAdmin = {
        Authorization: `Bearer ${await createAdminToken(ctx, clientBot.id)}`,
      };

      const list = await request(server())
        .get("/api/knowledge")
        .set(clientAdmin)
        .expect(200);
      expect(
        z
          .array(z.object({ id: z.string() }))
          .parse(list.body)
          .map((d) => d.id),
      ).not.toContain(asisDoc.id);
      await request(server())
        .delete(`/api/knowledge/${asisDoc.id}`)
        .set(clientAdmin)
        .expect(404);
    });

    it("ignores the bot header on admin requests (the token decides)", async () => {
      const asisDoc = await ctx.prisma.knowledgeSource.create({
        data: { type: "TEXT", status: "READY", title: "Asis", content: "x" },
      });
      const clientAdmin = await createAdminToken(ctx, clientBot.id);

      const res = await request(server())
        .get("/api/knowledge")
        .set("Authorization", `Bearer ${clientAdmin}`)
        .set(BOT_HEADER, "pk_asisaltura")
        .expect(200);

      expect(
        z
          .array(z.object({ id: z.string() }))
          .parse(res.body)
          .map((d) => d.id),
      ).not.toContain(asisDoc.id);
    });
  });

  describe("Allowed origins — optional hint per bot", () => {
    it("rejects browsers on other sites (403) and accepts the listed one", async () => {
      const restricted = await createBot(ctx.prisma, {
        allowedOrigins: ["https://cliente.example"],
      });

      await request(server())
        .get("/api/bot-config")
        .set(BOT_HEADER, restricted.publicKey)
        .set("Origin", "https://otro-sitio.example")
        .expect(403);
      await request(server())
        .get("/api/bot-config")
        .set(BOT_HEADER, restricted.publicKey)
        .set("Origin", "https://cliente.example")
        .expect(200);
    });
  });
});
