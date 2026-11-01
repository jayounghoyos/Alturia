import { contrastRatio } from "@alturia/widget/branding";
import { useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "../auth/auth-context";
import { BotContext, type BotValue } from "./bot-context";
import { useAsync } from "../lib/useAsync";

/** How often the open-case count in the sidebar refreshes. */
const INBOX_REFRESH_MS = 20_000;

/**
 * The signed-in admin's bot. Its brand colour becomes the dashboard's one
 * accent, so each client works in a panel that carries their own brand.
 */
export function BotProvider({ children }: { children: ReactNode }) {
  const { api, admin } = useAuth();
  const scope = admin?.email ?? "";
  const bot = useAsync(() => api.getBot(), scope);
  const inbox = useAsync(async () => {
    const cases = await api.listEscalations();
    return { cases, updatedAt: new Date() };
  }, scope);

  const reloadInbox = inbox.reload;
  useEffect(() => {
    const timer = window.setInterval(reloadInbox, INBOX_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reloadInbox]);

  useEffect(() => {
    const color = bot.data?.theme.primaryColor;
    if (!color) return;
    // The accent marks text and 2px lines on white: keep it at 3:1 or more.
    const accent =
      contrastRatio(color, "#ffffff") >= 3
        ? color
        : `color-mix(in srgb, ${color} 55%, #131416)`;
    document.documentElement.style.setProperty("--color-accent", accent);
  }, [bot.data?.theme.primaryColor]);

  const value = useMemo<BotValue>(
    () => ({
      bot: bot.data,
      setBot: bot.set,
      inbox: {
        cases: inbox.data?.cases,
        error: inbox.error,
        loading: inbox.loading,
        updatedAt: inbox.data?.updatedAt,
        reload: inbox.reload,
      },
    }),
    [bot.data, bot.set, inbox.data, inbox.error, inbox.loading, inbox.reload],
  );
  return <BotContext value={value}>{children}</BotContext>;
}
