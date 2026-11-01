import type { BotConfig } from "@alturia/shared";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LiveWidget, PreviewWidget } from "./chat/WidgetRoots";
import type { EmbedConfig } from "./embed/embed-config";
import widgetStyles from "./widget.css?inline";

export type MountOptions =
  | { mode: "live"; embed: EmbedConfig }
  | {
      /** Dashboard preview: no API calls except loading the avatar image. */
      mode: "preview";
      config: BotConfig;
      apiBaseUrl: string;
    };

export interface MountedWidget {
  /** Preview only: re-render with an edited config. */
  update(config: BotConfig): void;
  unmount(): void;
}

/**
 * Renders the widget inside `host`'s shadow root: the host page's CSS never
 * gets in and ours never leaks out.
 */
export function mountWidget(
  host: HTMLElement,
  options: MountOptions,
): MountedWidget {
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  shadowRoot.replaceChildren();

  const style = document.createElement("style");
  style.textContent = widgetStyles;
  const mountPoint = document.createElement("div");
  mountPoint.className = "alturia-widget-root";
  if (options.mode === "preview") mountPoint.style.height = "100%";
  shadowRoot.append(style, mountPoint);

  const root = createRoot(mountPoint);
  const render = (opts: MountOptions) =>
    root.render(
      <StrictMode>
        {opts.mode === "live" ? (
          <LiveWidget embed={opts.embed} />
        ) : (
          <PreviewWidget config={opts.config} apiBaseUrl={opts.apiBaseUrl} />
        )}
      </StrictMode>,
    );
  render(options);

  return {
    update(config) {
      if (options.mode === "preview") render({ ...options, config });
    },
    unmount() {
      root.unmount();
      shadowRoot.replaceChildren();
    },
  };
}
