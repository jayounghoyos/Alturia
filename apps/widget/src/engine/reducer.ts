import type { Msg, Step } from "./types";

export interface ChatState {
  messages: Msg[];
  step: Step;
  sending: boolean;
}

/** A message before the reducer gives it an id (Omit applied to each variant). */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
export type NewMsg = WithoutId<Msg>;

export type ChatEvent =
  | { type: "push"; messages: NewMsg[] }
  | { type: "remove"; id: string }
  | { type: "choose"; id: string; index: number }
  | { type: "step"; step: Step }
  | { type: "sending"; sending: boolean }
  | { type: "reset" };

export const initialChatState: ChatState = {
  messages: [],
  step: { kind: "idle" },
  sending: false,
};

export function chatReducer(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case "push":
      return {
        ...state,
        messages: [
          ...state.messages,
          ...event.messages.map(
            (m) => ({ ...m, id: crypto.randomUUID() }) as Msg,
          ),
        ],
      };
    case "remove":
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== event.id),
      };
    case "choose":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id && m.kind === "options" && m.chosen === undefined
            ? { ...m, chosen: event.index }
            : m,
        ),
      };
    case "step":
      return { ...state, step: event.step };
    case "sending":
      return { ...state, sending: event.sending };
    case "reset":
      return initialChatState;
  }
}
