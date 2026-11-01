import type { BotConfig } from "@alturia/shared";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { ApiClient } from "../api/client";
import type { SessionStore } from "../embed/storage";
import { es } from "../i18n/es";
import { ChatIcon, CloseIcon, SendIcon } from "../icons";
import { themeVariables } from "../theme/theme";
import { WidgetHeader } from "../components/WidgetHeader";
import { MessageView } from "./MessageView";
import { useChat } from "./useChat";

export type WidgetLayout = "floating" | "inline";

/**
 * The launcher and the chat panel. `floating` is the embed on a client's
 * site (fixed to the viewport); `inline` is the dashboard preview, laid out
 * inside its container and open from the start.
 */
export function ChatWidget({
  api,
  config,
  session,
  botKey,
  layout = "floating",
  notice,
}: {
  api: ApiClient;
  config: BotConfig;
  session: SessionStore;
  botKey?: string;
  layout?: WidgetLayout;
  /** Shown above the conversation (the preview's "sample answers" note). */
  notice?: string;
}) {
  const [open, setOpen] = useState(layout === "inline");
  const chat = useChat({ api, config, session, botKey, open });
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [input, setInput] = useState("");
  const { messages, sending } = chat.state;

  // Keep the newest message in view, including cards that grow after they
  // render (the QR camera, images).
  useEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    const toBottom = () => {
      list.scrollTop = list.scrollHeight;
    };
    toBottom();
    const observer = new MutationObserver(toBottom);
    observer.observe(list, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  function toggle(next: boolean) {
    setOpen(next);
    // Move focus with the panel: into the text box on open, back to the
    // launcher on close, so keyboard users never lose their place.
    queueMicrotask(() =>
      next ? inputRef.current?.focus() : launcherRef.current?.focus(),
    );
  }

  function send() {
    if (!input.trim() || sending) return;
    chat.send(input);
    setInput("");
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Ignore the Enter that confirms an IME composition (accents, CJK).
    if (event.key === "Enter" && !event.nativeEvent.isComposing) send();
  }

  const left = config.theme.position === "bottom-left";
  const container =
    layout === "floating"
      ? `fixed bottom-5 ${left ? "left-5 items-start" : "right-5 items-end"} z-[2147483000]`
      : `relative h-full w-full justify-end ${left ? "items-start" : "items-end"}`;
  const panelSize =
    layout === "floating"
      ? "h-[min(600px,calc(100dvh-7rem))] w-[380px] max-w-[calc(100vw-2.5rem)]"
      : "min-h-0 w-full max-w-[380px] flex-1";

  return (
    <div
      className={`flex flex-col gap-3 ${container}`}
      style={themeVariables(config.theme)}
    >
      {open && (
        <dialog
          open
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") toggle(false);
          }}
          className={`static m-0 flex flex-col overflow-hidden rounded-2xl border-0 bg-surface p-0 text-ink shadow-2xl ring-1 ring-black/10 ${panelSize}`}
        >
          <WidgetHeader
            config={config}
            titleId={titleId}
            resolveUrl={api.resolve}
            onClose={() => toggle(false)}
          />

          {notice && (
            <p className="border-b border-line-soft bg-surface-muted px-4 py-2 text-xs text-muted">
              {notice}
            </p>
          )}

          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((message) => (
              <MessageView
                key={message.id}
                message={message}
                handlers={{
                  choose: chat.choose,
                  qrDecoded: chat.qrDecoded,
                  qrFallback: chat.canFallBackToId
                    ? chat.qrFallback
                    : undefined,
                  removeMessage: chat.removeMessage,
                  scheduleRetraining: chat.scheduleRetraining,
                }}
              />
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-xl bg-bubble px-3 py-2 text-sm text-faint">
                {es.typing}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-line-soft p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor={`${titleId}-input`} className="sr-only">
              {es.input.label}
            </label>
            <input
              id={`${titleId}-input`}
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={es.input.placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-line bg-bubble px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label={es.input.send}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        </dialog>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => toggle(!open)}
        aria-label={open ? es.launcher.close : es.launcher.open}
        aria-expanded={open}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {open ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <ChatIcon className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
