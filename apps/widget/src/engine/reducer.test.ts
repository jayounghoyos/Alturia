import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState } from "./reducer";

describe("chat reducer", () => {
  const withMenu = chatReducer(initialChatState, {
    type: "push",
    messages: [
      {
        kind: "options",
        options: [
          { label: "A", icon: "search", action: { type: "menu" } },
          { label: "B", icon: "faq", action: { type: "menu" } },
        ],
      },
    ],
  });
  const menu = withMenu.messages[0]!;

  it("gives every pushed message an id", () => {
    expect(menu.id).toEqual(expect.any(String));
  });

  it("spends a menu once an option is chosen, and keeps the first choice", () => {
    const once = chatReducer(withMenu, {
      type: "choose",
      id: menu.id,
      index: 1,
    });
    const twice = chatReducer(once, { type: "choose", id: menu.id, index: 0 });
    expect(twice.messages[0]).toMatchObject({ kind: "options", chosen: 1 });
  });

  it("removes a message by id", () => {
    expect(
      chatReducer(withMenu, { type: "remove", id: menu.id }).messages,
    ).toEqual([]);
  });
});
