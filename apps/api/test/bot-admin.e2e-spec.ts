import { BotConfigSchema, BotSettingsSchema } from "@alturia/shared";
import type { Bot } from "@prisma/client";
import request from "supertest";
import {
  BOT_HEADER,
  createAdminToken,
  createBot,
  createE2eApp,
  type E2eContext,
} from "./utils/e2e-app";

// 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

describe("A client edits their own bot from the dashboard (e2e)", () => {
  let ctx: E2eContext;
  let bot: Bot;
  let auth: { Authorization: string };

  beforeAll(async () => {
    ctx = await createE2eApp();
    bot = await createBot(ctx.prisma, {
      features: ["CERTIFICATES", "FAQ", "HUMAN_HANDOFF"],
    });
    auth = { Authorization: `Bearer ${await createAdminToken(ctx, bot.id)}` };
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const server = () => ctx.app.getHttpServer();
  const patch = (body: object) =>
    request(server()).patch("/api/admin/bot").set(auth).send(body);
  const putAvatar = (bytes: Buffer) =>
    request(server())
      .put("/api/admin/bot/avatar")
      .set(auth)
      .set("Content-Type", "image/png")
      .send(bytes);

  describe("GET/PATCH /api/admin/bot — branding and behaviour", () => {
    it("rejects requests without a token (401)", async () => {
      await request(server()).get("/api/admin/bot").expect(401);
    });

    it("returns the admin's own bot", async () => {
      const res = await request(server())
        .get("/api/admin/bot")
        .set(auth)
        .expect(200);
      expect(BotSettingsSchema.parse(res.body)).toMatchObject({
        publicKey: bot.publicKey,
        name: bot.name,
        theme: { primaryColor: "#123456", avatarPreset: "chat" },
      });
    });

    it("saves name and colours, and the widget sees them right away", async () => {
      const res = await patch({
        name: "Ferretería Norte",
        theme: { primaryColor: "#0F766E", avatarPreset: "shield" },
      }).expect(200);
      expect(BotSettingsSchema.parse(res.body).theme).toEqual({
        primaryColor: "#0F766E",
        position: "bottom-left",
        avatarPreset: "shield",
      });

      const config = await request(server())
        .get("/api/bot-config")
        .set(BOT_HEADER, bot.publicKey)
        .expect(200);
      expect(BotConfigSchema.parse(config.body)).toMatchObject({
        name: "Ferretería Norte",
        theme: { primaryColor: "#0F766E", avatarPreset: "shield" },
      });
    });

    it("toggles only self-service features and keeps the client-specific ones", async () => {
      const res = await patch({ features: ["FAQ"] }).expect(200);
      expect(BotSettingsSchema.parse(res.body).features.sort()).toEqual([
        "CERTIFICATES",
        "FAQ",
      ]);

      await patch({ features: ["FAQ", "APPOINTMENTS"] }).expect(400);
    });

    it("validates input: bad colour, bad origin, unknown field (400)", async () => {
      await patch({ theme: { primaryColor: "blue" } }).expect(400);
      await patch({ allowedOrigins: ["https://site.example/path"] }).expect(
        400,
      );
      await patch({ publicKey: "pk_hijack" }).expect(400);
    });
  });

  describe("PUT/DELETE /api/admin/bot/avatar — logo stored in Postgres", () => {
    it("stores an image and serves it, cacheable, at a versioned URL", async () => {
      const first = await putAvatar(PNG).expect(200);
      const { avatarUrl } = BotSettingsSchema.parse(first.body);
      expect(avatarUrl).toBe(`/api/bots/${bot.publicKey}/avatar?v=1`);

      const image = await request(server())
        .get(avatarUrl ?? "")
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(image.headers["content-type"]).toBe("image/png");
      expect(image.headers["cache-control"]).toContain("immutable");
      expect(image.headers["x-content-type-options"]).toBe("nosniff");
      expect(Buffer.compare(image.body as Buffer, PNG)).toBe(0);

      const second = await putAvatar(PNG).expect(200);
      expect(BotSettingsSchema.parse(second.body).avatarUrl).toMatch(/v=2$/);
    });

    it("rejects a file that only claims to be an image (415) and one too large (413)", async () => {
      await putAvatar(Buffer.from("<svg onload=alert(1)>")).expect(415);
      await putAvatar(Buffer.concat([PNG, Buffer.alloc(101 * 1024)])).expect(
        413,
      );
    });

    it("removes the image and falls back to the preset", async () => {
      const res = await request(server())
        .delete("/api/admin/bot/avatar")
        .set(auth)
        .expect(200);
      expect(BotSettingsSchema.parse(res.body).avatarUrl).toBeNull();
      await request(server())
        .get(`/api/bots/${bot.publicKey}/avatar?v=2`)
        .expect(404);
    });
  });
});
