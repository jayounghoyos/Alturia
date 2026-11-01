import { readEmbedConfig } from "./embed/embed-config";
import { mountWidget } from "./mount";

/**
 * Embed entry point (built as the IIFE widget.js):
 *   <script src="https://alturia-widget.vercel.app/widget.js" data-bot="pk_..." defer></script>
 * Without data-bot the API serves its default bot, so embeds from before
 * multi-bot support keep working.
 */

// Must be read synchronously at load: document.currentScript is null later.
const embed = readEmbedConfig(
  document.currentScript,
  import.meta.env.VITE_WIDGET_API_BASE_URL,
);

function start() {
  const host = document.createElement("div");
  host.id = embed.botKey ? `alturia-widget-${embed.botKey}` : "alturia-widget";
  document.body.appendChild(host);
  mountWidget(host, { mode: "live", embed });
}

// A script in <head> without defer runs before <body> exists.
if (document.body) start();
else document.addEventListener("DOMContentLoaded", start, { once: true });
