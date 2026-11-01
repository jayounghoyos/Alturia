import type { BotConfig, BotFeature } from "@alturia/shared";
import type { ApiClient } from "../api/client";
import type { NewMsg } from "../engine/reducer";
import type { Step } from "../engine/types";
import type { Strings } from "../i18n/es";

/** Everything a feature may do to the conversation. Built by chat/useChat.ts. */
export interface ChatContext {
  api: ApiClient;
  config: BotConfig;
  t: Strings;
  has(feature: BotFeature): boolean;
  sessionId(): string;
  /** Bot bubbles, in order. */
  say(...texts: string[]): void;
  /** Echo what the visitor typed. */
  echo(text: string): void;
  push(...messages: NewMsg[]): void;
  setStep(step: Step): void;
  /** Shows the typing indicator while `task` runs. */
  busy<T>(task: () => Promise<T>): Promise<T>;
  showMenu(): void;
  /** "Anything else?" with the given options plus "back to menu". */
  offerMore(options?: NewMsgOptions): void;
  /** Sends free text to the bot (LLM, FAQ and keyword handoff). */
  ask(text: string): Promise<void>;
  /** Starts listening for the human advisor's replies. */
  awaitAdvisor(): void;
}

export type NewMsgOptions = Extract<NewMsg, { kind: "options" }>["options"];
