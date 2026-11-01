import { describe, expect, it } from "vitest";
import { contrastRatio, readableTextOn, themeVariables } from "./theme";

describe("brand theme", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#0180e1", "#0180e1")).toBe(1);
  });

  it("puts white text on dark brands and dark text on light ones", () => {
    expect(readableTextOn("#7c2d12")).toBe("#ffffff");
    expect(readableTextOn("#fec456")).toBe("#0b0f14");
  });

  it("turns a bot theme into the CSS variables the widget reads", () => {
    expect(
      themeVariables({
        primaryColor: "#0f766e",
        position: "bottom-right",
        avatarPreset: "chat",
      }),
    ).toEqual({
      "--color-primary": "#0f766e",
      "--color-primary-fg": "#ffffff",
      "--color-primary-soft": "color-mix(in srgb, #0f766e 12%, white)",
    });
  });

  it("falls back to the default brand for an invalid colour", () => {
    expect(
      themeVariables({
        primaryColor: "red; background: url(x)",
        position: "bottom-right",
        avatarPreset: "chat",
      })["--color-primary"],
    ).toBe("#0180e1");
  });
});
