import type { BotSettings, EscalationRecord } from "@alturia/shared";
import { createContext, useContext } from "react";

export interface BotValue {
  bot: BotSettings | undefined;
  setBot(bot: BotSettings): void;
  /** Open and in-progress cases, shared by the sidebar count and the inbox. */
  inbox: {
    cases: EscalationRecord[] | undefined;
    error: Error | undefined;
    loading: boolean;
    updatedAt: Date | undefined;
    reload(): void;
  };
}

export const BotContext = createContext<BotValue | null>(null);

export function useBot(): BotValue {
  const value = useContext(BotContext);
  if (!value) throw new Error("useBot must be used inside <BotProvider>");
  return value;
}
