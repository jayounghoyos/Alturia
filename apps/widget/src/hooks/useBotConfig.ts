import { BotConfigSchema, type BotConfig } from "@alturia/shared";
import { useEffect, useState } from "react";
import type { ApiClient } from "../api/client";
import { readStorage, storageKey, writeStorage } from "../embed/storage";

/**
 * The bot's config, stale-while-revalidate: the last config seen on this
 * site renders the launcher at once (the API may be cold-starting for up to a
 * minute on its free tier), then the fresh one replaces it.
 */
export function useBotConfig(
  api: ApiClient,
  botKey: string | undefined,
): BotConfig | null {
  const cacheKey = storageKey("config", botKey);
  const [config, setConfig] = useState<BotConfig | null>(() =>
    readCached(cacheKey),
  );

  useEffect(() => {
    const controller = new AbortController();
    api
      .fetchBotConfig()
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setConfig(fresh);
        writeStorage(cacheKey, JSON.stringify(fresh));
      })
      .catch(() => {
        // API unreachable: keep the cached config, or stay hidden without one.
      });
    return () => controller.abort();
  }, [api, cacheKey]);

  return config;
}

function readCached(key: string): BotConfig | null {
  const raw = readStorage(key);
  if (!raw) return null;
  try {
    return BotConfigSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
