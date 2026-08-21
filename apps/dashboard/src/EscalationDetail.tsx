import { useEffect, useRef, useState } from "react";
import type { EscalationDetail as EscalationDetailData } from "@alturia/shared";
import { fetchEscalationDetail, replyToEscalation, resolveEscalation } from "./api";

const ROLE_LABEL: Record<string, string> = {
  USER: "Trabajador",
  BOT: "Bot",
  ADMIN: "Tú (asesor)",
  SYSTEM: "Sistema",
};

export function EscalationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<EscalationDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function load() {
    fetchEscalationDetail(id)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(load, [id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [data]);

  async function handleReply() {
    const content = reply.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await replyToEscalation(id, content);
      setReply("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function handleResolve() {
    setResolving(true);
    try {
      await resolveEscalation(id);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
      setResolving(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-primary hover:underline">
            ← Volver a la bandeja
          </button>
          <p className="mt-1 text-sm text-ink">{data.escalation.reason}</p>
        </div>
        {data.escalation.status !== "RESOLVED" && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="rounded-lg bg-ok px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {resolving ? "Resolviendo…" : "Marcar como resuelto"}
          </button>
        )}
      </div>

      <div className="mt-4 flex h-[500px] flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {data.messages.map((m) => (
            <div key={m.id} className={m.role === "ADMIN" ? "ml-auto max-w-[75%]" : "max-w-[75%]"}>
              <p className="mb-0.5 text-xs text-faint">{ROLE_LABEL[m.role] ?? m.role}</p>
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.role === "ADMIN"
                    ? "bg-primary text-white"
                    : m.role === "USER"
                      ? "bg-slate-100 text-ink"
                      : "bg-blue-50 text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {data.escalation.status !== "RESOLVED" && (
          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
              placeholder="Escribe una respuesta como asesor..."
              className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleReply}
              disabled={sending}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
