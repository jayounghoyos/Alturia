import request from "supertest";
import { createE2eApp, type E2eContext } from "./utils/e2e-app";

describe("Health check (e2e)", () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it("GET / responds 200 with status ok once the app is connected to the database", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/").expect(200);
    expect((res.body as { status: string }).status).toBe("ok");
  });
});
