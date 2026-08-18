import { useEffect, useRef, useState } from "react";
import { fetchBotConfig, getOrCreateSessionId, sendChatMessage, type BotConfig } from "./api";

type ChatMessage = {
  role: "user" | "bot";
  content: string;
};

export function ChatWidget() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef(getOrCreateSessionId());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBotConfig()
      .then((cfg) => {
        setConfig(cfg);
        setMessages([{ role: "bot", content: cfg.greeting }]);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await sendChatMessage(sessionId.current, text);
      setMessages((prev) => [...prev, { role: "bot", content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Tuvimos un problema respondiendo. Intenta de nuevo en un momento.",
        },
      ]);
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loadError) return null; // backend unavailable — fail silently on the host page
  if (!config) return null; // still loading

  const primary = config.theme.primaryColor;
  const positionClass =
    config.theme.position === "bottom-left" ? "left-5" : "right-5";

  return (
    <div className={`fixed bottom-5 ${positionClass} z-[2147483000] flex flex-col items-end gap-3`}>
      {open && (
        <div className="flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: primary }}
          >
            <span className="font-semibold">{config.name}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 text-white/90 hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-400">
                Escribiendo…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              aria-label="Enviar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: primary }}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
