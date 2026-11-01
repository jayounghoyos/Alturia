import { BotConfigSchema, type BotConfig } from "@alturia/shared";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/client";
import { es } from "../i18n/es";
import { ChatWidget } from "./ChatWidget";

const cafe: BotConfig = BotConfigSchema.parse({
  name: "Café Ladera",
  greeting: "¡Hola! Soy el asistente de Café Ladera.",
  theme: {
    primaryColor: "#7C2D12",
    position: "bottom-left",
    avatarPreset: "chat",
  },
  features: ["FAQ", "HUMAN_HANDOFF"],
  faqQuickQuestions: ["¿Cuál es el horario?"],
  handoffMessage: "Le avisé al equipo de Café Ladera.",
});

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    fetchBotConfig: vi.fn(async () => cafe),
    sendChatMessage: vi.fn(async () => ({
      reply: "Abrimos de 7 a 7.",
      lowConfidence: false,
      escalationOffered: false,
      awaitingHuman: false,
    })),
    lookupCertificate: vi.fn(),
    lookupCertificateByQr: vi.fn(),
    fetchCourses: vi.fn(async () => []),
    fetchAvailability: vi.fn(async () => []),
    createAppointment: vi.fn(),
    createEscalation: vi.fn(async () => undefined),
    fetchConversationMessages: vi.fn(async () => []),
    resolve: (path) => `https://api.example${path}`,
    ...overrides,
  };
}

const session = {
  get: () => "11111111-1111-4111-8111-111111111111",
  reset: () => "x",
};

function renderOpen(api = fakeApi(), config = cafe) {
  render(
    <ChatWidget api={api} config={config} session={session} botKey="pk_demo" />,
  );
  fireEvent.click(screen.getByRole("button", { name: es.launcher.open }));
  return api;
}

describe("ChatWidget", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("greets with the bot's own copy and offers only its enabled features", () => {
    renderOpen();

    expect(screen.getByRole("dialog", { name: "Café Ladera" })).toBeTruthy();
    expect(screen.getByText(cafe.greeting)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: new RegExp(es.menu.faq) }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: new RegExp(es.menu.certificates) }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: new RegExp(es.menu.appointments) }),
    ).toBeNull();
  });

  it("paints the brand colour through CSS variables", () => {
    renderOpen();
    const root = screen.getByRole("dialog").parentElement as HTMLElement;
    expect(root.style.getPropertyValue("--color-primary")).toBe("#7C2D12");
    expect(root.style.getPropertyValue("--color-primary-fg")).toBe("#ffffff");
  });

  it("spends a menu after one choice, and answers the bot's quick questions", async () => {
    const api = renderOpen();

    const faq = screen.getByRole("button", { name: new RegExp(es.menu.faq) });
    fireEvent.click(faq);
    expect((faq as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(
      await screen.findByRole("button", { name: /¿Cuál es el horario\?/ }),
    );
    expect(await screen.findByText("Abrimos de 7 a 7.")).toBeTruthy();
    expect(api.sendChatMessage).toHaveBeenCalledWith(
      session.get(),
      "¿Cuál es el horario?",
    );
  });

  it("hands off to a human with the bot's handoff message", async () => {
    const api = renderOpen();

    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(es.menu.handoff) }),
    );

    expect(
      await screen.findByText("Le avisé al equipo de Café Ladera."),
    ).toBeTruthy();
    expect(api.createEscalation).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: session.get() }),
    );
  });

  it("sends free text to the bot and labels the input for screen readers", async () => {
    const api = renderOpen();

    const input = screen.getByLabelText(es.input.label);
    fireEvent.change(input, { target: { value: "¿Tienen domicilio?" } });
    fireEvent.click(screen.getByRole("button", { name: es.input.send }));

    await waitFor(() =>
      expect(api.sendChatMessage).toHaveBeenCalledWith(
        session.get(),
        "¿Tienen domicilio?",
      ),
    );
  });

  it("closes with Escape", async () => {
    renderOpen();
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
