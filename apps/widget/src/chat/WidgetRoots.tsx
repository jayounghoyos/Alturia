import type { BotConfig } from "@alturia/shared";
import { useMemo } from "react";
import { createApiClient, type ApiClient } from "../api/client";
import { createPreviewApi } from "../api/preview";
import type { EmbedConfig } from "../embed/embed-config";
import { createSessionStore } from "../embed/storage";
import { useBotConfig } from "../hooks/useBotConfig";
import { es } from "../i18n/es";
import { ChatWidget } from "./ChatWidget";

/** The widget on a client's site: talks to the API as the embedded bot. */
export function LiveWidget({ embed }: { embed: EmbedConfig }) {
  const api = useMemo(
    () => createApiClient({ baseUrl: embed.apiBaseUrl, botKey: embed.botKey }),
    [embed.apiBaseUrl, embed.botKey],
  );
  const session = useMemo(
    () => createSessionStore(embed.botKey),
    [embed.botKey],
  );
  const config = useBotConfig(api, embed.botKey);
  // No config yet and none cached (API down on a first visit): stay invisible
  // rather than show a broken widget on the client's site.
  if (!config) return null;
  return (
    <ChatWidget
      api={api}
      config={config}
      session={session}
      botKey={embed.botKey}
    />
  );
}

/** The dashboard preview: same widget, sample answers, edits apply live. */
export function PreviewWidget({
  config,
  apiBaseUrl,
}: {
  config: BotConfig;
  apiBaseUrl: string;
}) {
  const api: ApiClient = useMemo(() => {
    const real = createApiClient({ baseUrl: apiBaseUrl });
    return createPreviewApi(() => config, real.resolve);
  }, [apiBaseUrl, config]);
  const session = useMemo(() => createSessionStore("preview"), []);
  // Conversation copy changed: restart the sample conversation so the
  // greeting and menu show the edit. Colours and name update in place.
  const conversationKey = JSON.stringify([
    config.greeting,
    config.features,
    config.faqQuickQuestions,
  ]);
  return (
    <ChatWidget
      key={conversationKey}
      api={api}
      config={config}
      session={session}
      layout="inline"
      notice={es.previewNotice}
    />
  );
}
