import { describe, expect, it } from "vitest";
import { es } from "../i18n/es";
import { mainMenuOptions } from "./menu";

describe("main menu", () => {
  it("shows only the bot's enabled features, in a fixed order", () => {
    const labels = mainMenuOptions(["HUMAN_HANDOFF", "FAQ"], es).map(
      (o) => o.label,
    );
    expect(labels).toEqual([es.menu.faq, es.menu.handoff]);
  });

  it("shows Asis Altura's full menu", () => {
    expect(
      mainMenuOptions(
        ["CERTIFICATES", "QR", "APPOINTMENTS", "FAQ", "HUMAN_HANDOFF"],
        es,
      ),
    ).toHaveLength(5);
  });
});
