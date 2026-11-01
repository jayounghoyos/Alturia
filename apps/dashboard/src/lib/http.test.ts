import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttp, HttpError } from "./http";

function respond(status: number, body: unknown) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
}

describe("dashboard http client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the bearer token only when signed in", async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal("fetch", fetchMock);
    let token: string | null = null;
    const http = createHttp({
      baseUrl: "https://api.test/",
      getToken: () => token,
      onUnauthorized: vi.fn(),
    });

    await http.request("/a", z.object({ ok: z.boolean() }));
    token = "abc";
    await http.request("/b", z.object({ ok: z.boolean() }));

    const headers = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).headers,
    );
    expect(headers[0]).toEqual({});
    expect(headers[1]).toEqual({ Authorization: "Bearer abc" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/a");
  });

  it("signs out on a 401 and surfaces the API's own message", async () => {
    vi.stubGlobal("fetch", respond(401, { message: "Unauthorized" }));
    const onUnauthorized = vi.fn();
    const http = createHttp({
      baseUrl: "",
      getToken: () => "expired",
      onUnauthorized,
    });

    await expect(http.request("/x", null)).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("joins Nest validation messages", async () => {
    vi.stubGlobal(
      "fetch",
      respond(400, { message: ["name too short", "bad colour"] }),
    );
    const http = createHttp({
      baseUrl: "",
      getToken: () => "t",
      onUnauthorized: vi.fn(),
    });

    const error = await http.request("/x", null).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).message).toBe("name too short · bad colour");
  });
});
