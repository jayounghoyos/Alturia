import { afterEach, describe, expect, it } from "vitest";
import { readEmbedConfig } from "./embed-config";

const DEFAULT_API = "https://api.example";

function script(attrs: Record<string, string>) {
  const el = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

describe("embed config", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    delete window.AlturiaWidgetConfig;
  });

  it("reads the bot key and API from the script's data attributes", () => {
    const config = readEmbedConfig(
      script({ "data-bot": " pk_cafe ", "data-api": "https://other.example" }),
      DEFAULT_API,
    );
    expect(config).toEqual({
      botKey: "pk_cafe",
      apiBaseUrl: "https://other.example",
    });
  });

  it("uses the default bot and API for an embed without attributes (old embeds)", () => {
    expect(readEmbedConfig(script({}), DEFAULT_API)).toEqual({
      apiBaseUrl: DEFAULT_API,
    });
  });

  it("falls back to a script[data-bot] in the page when currentScript is gone", () => {
    document.head.append(script({ "data-bot": "pk_found" }));
    expect(readEmbedConfig(null, DEFAULT_API).botKey).toBe("pk_found");
  });

  it("accepts window.AlturiaWidgetConfig for dynamically injected scripts", () => {
    window.AlturiaWidgetConfig = { bot: "pk_window" };
    expect(readEmbedConfig(null, DEFAULT_API)).toEqual({
      botKey: "pk_window",
      apiBaseUrl: DEFAULT_API,
    });
  });
});
