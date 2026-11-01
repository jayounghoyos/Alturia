/**
 * localStorage lives on the host site's origin, so every key carries the bot
 * key: two bots on one site never share a session or a cached config. Access
 * can throw (private mode, blocked storage) — the widget then just works
 * without persistence.
 */
export function storageKey(name: string, botKey: string | undefined): string {
  // The default bot keeps the pre-multi-bot key so returning visitors keep
  // their conversation.
  return botKey ? `alturia-${name}:${botKey}` : `alturia-${name}`;
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: nothing to persist.
  }
}

/** One anonymous visitor id per bot per browser, reused across visits. */
export function createSessionStore(botKey: string | undefined) {
  const key = storageKey("session", botKey);
  const reset = (): string => {
    const fresh = crypto.randomUUID();
    writeStorage(key, fresh);
    return fresh;
  };
  return { get: () => readStorage(key) ?? reset(), reset };
}
export type SessionStore = ReturnType<typeof createSessionStore>;
