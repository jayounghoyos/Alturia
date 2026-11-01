import type { MessageRecord } from "@alturia/shared";
import { useEffect, useRef } from "react";
import type { ApiClient } from "../api/client";

const POLL_INTERVAL_MS = 4_000;

/**
 * While a human advisor has the case and the panel is open, polls for the
 * advisor's replies typed in the dashboard. One request at a time (the next
 * one is scheduled after the previous finishes), stopped when closed.
 */
export function useAdvisorReplies({
  api,
  sessionId,
  active,
  open,
  onReplies,
}: {
  api: ApiClient;
  sessionId: string;
  active: boolean;
  open: boolean;
  onReplies: (replies: MessageRecord[]) => void;
}): void {
  const seen = useRef<Set<string> | null>(null);
  const callback = useRef(onReplies);

  useEffect(() => {
    callback.current = onReplies;
  }, [onReplies]);

  useEffect(() => {
    if (!active || !open) return;
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      try {
        const messages = await api.fetchConversationMessages(sessionId);
        if (cancelled) return;
        if (!seen.current) {
          // First look: whatever is already there was shown before.
          seen.current = new Set(messages.map((m) => m.id));
        } else {
          const known = seen.current;
          const fresh = messages.filter(
            (m) => m.role === "ADMIN" && !known.has(m.id),
          );
          messages.forEach((m) => known.add(m.id));
          if (fresh.length > 0) callback.current(fresh);
        }
      } catch {
        // Network hiccup: try again on the next tick.
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, sessionId, active, open]);
}
