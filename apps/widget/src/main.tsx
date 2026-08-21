import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import widgetStyles from "./widget.css?inline";
import { ChatWidget } from "./ChatWidget";

/**
 * Embed entry point. Usage on asisaltura.com:
 *   <script src="https://cdn.alturia.app/widget.js" defer></script>
 *
 * One fixed bot — no data-client-id, since there's no multi-tenancy.
 */
mount();

function mount() {
  const host = document.createElement("div");
  host.id = "alturia-widget";
  document.body.appendChild(host);

  // Shadow DOM: the host page's CSS never gets in, ours never leaks out.
  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleEl = document.createElement("style");
  styleEl.textContent = widgetStyles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "alturia-widget-root";
  shadowRoot.appendChild(mountPoint);

  createRoot(mountPoint).render(
    <StrictMode>
      <ChatWidget />
    </StrictMode>,
  );
}
