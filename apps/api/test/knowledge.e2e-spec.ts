import { randomUUID } from "node:crypto";
import { KnowledgeSourceRecordSchema } from "@alturia/shared";
import request from "supertest";
import { z } from "zod";
import {
  createAdminToken,
  createE2eApp,
  type E2eContext,
} from "./utils/e2e-app";

describe("Knowledge base that feeds the bot's prompt (e2e)", () => {
  let ctx: E2eContext;
  let auth: { Authorization: string };

  beforeAll(async () => {
    ctx = await createE2eApp();
    auth = { Authorization: `Bearer ${await createAdminToken(ctx)}` };
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it("rejects the knowledge endpoints without a token (401)", async () => {
    await request(ctx.app.getHttpServer()).get("/api/knowledge").expect(401);
  });

  it("lets an admin upload a document that the bot then uses as context", async () => {
    const server = ctx.app.getHttpServer();
    const marker = `Sede Envigado abre los sábados ${randomUUID()}`;

    const created = await request(server)
      .post("/api/knowledge")
      .set(auth)
      .send({ title: "Horarios", content: marker })
      .expect(201);
    const source = KnowledgeSourceRecordSchema.parse(created.body);

    const list = await request(server)
      .get("/api/knowledge")
      .set(auth)
      .expect(200);
    expect(
      z
        .array(KnowledgeSourceRecordSchema)
        .parse(list.body)
        .map((s) => s.id),
    ).toContain(source.id);

    await request(server)
      .post("/api/chat")
      .send({ sessionId: randomUUID(), message: "¿Abren los sábados?" })
      .expect(201);
    const [{ systemPrompt }] = ctx.llmChat.mock.calls[0];
    expect(systemPrompt).toContain(marker);
  });

  it("deletes a document, and 404s on one that does not exist", async () => {
    const server = ctx.app.getHttpServer();
    const created = await request(server)
      .post("/api/knowledge")
      .set(auth)
      .send({ title: "Temporal", content: "Se borra" })
      .expect(201);
    const { id } = KnowledgeSourceRecordSchema.parse(created.body);

    await request(server).delete(`/api/knowledge/${id}`).set(auth).expect(200);
    await request(server).delete(`/api/knowledge/${id}`).set(auth).expect(404);
  });

  it("responds 400 when the document is empty", async () => {
    await request(ctx.app.getHttpServer())
      .post("/api/knowledge")
      .set(auth)
      .send({ title: "Vacío", content: "" })
      .expect(400);
  });
});
