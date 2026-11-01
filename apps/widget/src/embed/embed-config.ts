/** How the host page told the widget which bot it is. */
export interface EmbedConfig {
  /** Public key from data-bot; undefined means the API's default bot. */
  botKey?: string;
  apiBaseUrl: string;
}

declare global {
  interface Window {
    /** Alternative to data-* attributes for sites that inject the script dynamically. */
    AlturiaWidgetConfig?: { bot?: string; apiBaseUrl?: string };
  }
}

/**
 * Reads the embed configuration, most specific first:
 *   <script src=".../widget.js" data-bot="pk_..." data-api="https://..."></script>
 *   window.AlturiaWidgetConfig = { bot: "pk_...", apiBaseUrl: "https://..." }
 * `script` must be `document.currentScript` captured synchronously at load —
 * it is null after any await, and in dev (type="module") it is always null,
 * hence the querySelector fallback.
 */
export function readEmbedConfig(
  script: HTMLOrSVGScriptElement | null,
  defaultApiBaseUrl: string,
  doc: Document = document,
  win: Window = window,
): EmbedConfig {
  const element =
    script instanceof HTMLScriptElement
      ? script
      : doc.querySelector<HTMLScriptElement>("script[data-bot]");
  const fromWindow = win.AlturiaWidgetConfig ?? {};

  const botKey = clean(element?.dataset.bot) ?? clean(fromWindow.bot);
  const apiBaseUrl =
    clean(element?.dataset.api) ??
    clean(fromWindow.apiBaseUrl) ??
    defaultApiBaseUrl;
  return botKey ? { botKey, apiBaseUrl } : { apiBaseUrl };
}

function clean(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}
