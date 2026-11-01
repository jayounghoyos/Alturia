import type { BotConfig } from "@alturia/shared";
import { mountWidget, type MountedWidget } from "@alturia/widget/preview";
import { useEffect, useRef } from "react";

/**
 * The real widget clients embed, rendered inline with sample answers. It
 * re-renders on every edit, so the admin sees the change before saving.
 */
export function WidgetPreview({
  config,
  apiBaseUrl,
}: {
  config: BotConfig;
  apiBaseUrl: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<MountedWidget | null>(null);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const widget = mountWidget(host, {
      mode: "preview",
      config: configRef.current,
      apiBaseUrl,
    });
    widgetRef.current = widget;
    return () => {
      widgetRef.current = null;
      // Unmount after the current render: React warns on a synchronous
      // unmount of a root while another root is rendering.
      queueMicrotask(() => widget.unmount());
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    widgetRef.current?.update(config);
  }, [config]);

  return <div ref={hostRef} className="h-full w-full" />;
}
