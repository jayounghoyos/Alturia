import type { EscalationDetail, MessageRecord } from "@alturia/shared";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { BlockError } from "../components/BlockError";
import { StatusPill } from "../components/StatusPill";
import { formatDateTime } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { useBot } from "../shell/bot-context";

/** The visitor may still be typing in the widget: keep the thread fresh. */
const THREAD_REFRESH_MS = 8_000;

export function EscalationThread({ id }: { id: string }) {
  const { api } = useAuth();
  const { bot, inbox } = useBot();
  const navigate = useNavigate();
  const detail = useAsync(() => api.getEscalation(id), id);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"send" | "resolve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const reload = detail.reload;
  useEffect(() => {
    const timer = window.setInterval(reload, THREAD_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const messageCount = detail.data?.messages.length ?? 0;
  // Scroll to the newest message whenever one arrives (count is the trigger).
  // oxlint-disable-next-line react/exhaustive-deps
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messageCount]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = reply.trim();
    if (!content || busy) return;
    setBusy("send");
    setError(null);
    try {
      await api.reply(id, content);
      setReply("");
      detail.reload();
      inbox.reload();
    } catch {
      setError(
        "No se envió la respuesta. Revisa la conexión e intenta de nuevo.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function resolve() {
    setBusy("resolve");
    setError(null);
    try {
      await api.resolve(id);
      inbox.reload();
      void navigate("/escalamientos");
    } catch {
      setError("No se pudo marcar como resuelto. Intenta de nuevo.");
      setBusy(null);
    }
  }

  if (detail.error && !detail.data) {
    return (
      <div className="p-6">
        <BlockError
          message="No pudimos abrir este caso."
          onRetry={detail.reload}
        />
      </div>
    );
  }
  const data = detail.data;
  const open = data && data.escalation.status !== "RESOLVED";

  return (
    <div className="flex min-h-0 w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-start gap-3 px-6 pt-6 pb-4">
          <Link
            to="/escalamientos"
            aria-label="Volver a la bandeja"
            className="-ml-2 flex h-8 w-8 flex-none items-center justify-center rounded-control text-muted hover:bg-raised hover:text-ink lg:hidden"
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">
              {data?.escalation.contactInfo?.name ?? "Visitante"}
            </h2>
            <p className="mt-0.5 truncate text-muted">
              {data?.escalation.reason ?? " "}
            </p>
          </div>
          {data && <StatusPill status={data.escalation.status} />}
          {open && (
            <button
              type="button"
              onClick={() => void resolve()}
              disabled={busy !== null}
              className="flex h-8 flex-none items-center gap-1.5 rounded-control border border-control px-3 font-medium hover:bg-raised disabled:opacity-60"
            >
              <Check size={14} aria-hidden />
              {busy === "resolve" ? "Resolviendo…" : "Marcar como resuelto"}
            </button>
          )}
        </header>

        <ol
          ref={listRef}
          aria-label="Mensajes"
          aria-live="polite"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto border-t border-rule px-6 py-4"
        >
          {data?.messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              botName={bot?.name ?? "Asistente"}
            />
          ))}
        </ol>

        {error && (
          <p role="alert" className="px-6 pb-2 text-negative">
            {error}
          </p>
        )}

        {open && (
          <form
            onSubmit={send}
            className="flex items-end gap-2 border-t border-rule px-6 py-4"
          >
            <label htmlFor="reply" className="sr-only">
              Respuesta al visitante
            </label>
            <textarea
              id="reply"
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Escribe tu respuesta. El visitante la ve en el chat."
              className="min-h-10 flex-1 resize-none rounded-[10px] border border-line px-3 py-2 outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={!reply.trim() || busy !== null}
              className="h-10 flex-none rounded-control bg-primary px-4 font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {busy === "send" ? "Enviando…" : "Enviar"}
            </button>
          </form>
        )}
      </div>

      {data && <CaseDetails data={data} />}
    </div>
  );
}

const ROLE: Record<MessageRecord["role"], string> = {
  USER: "Visitante",
  BOT: "",
  ADMIN: "Tú",
  SYSTEM: "Sistema",
};

function Message({
  message: m,
  botName,
}: {
  message: MessageRecord;
  botName: string;
}) {
  const mine = m.role === "ADMIN";
  return (
    <li className={`max-w-[75%] ${mine ? "ml-auto text-right" : ""}`}>
      <p className="mb-1 text-xs text-muted">
        {m.role === "BOT" ? botName : ROLE[m.role]} ·{" "}
        {formatDateTime(m.createdAt)}
      </p>
      <p
        className={`inline-block rounded-card px-3 py-2 text-left whitespace-pre-line ${
          mine
            ? "bg-primary text-white"
            : m.role === "USER"
              ? "bg-raised"
              : "border border-line"
        }`}
      >
        {m.content}
      </p>
    </li>
  );
}

function CaseDetails({ data }: { data: EscalationDetail }) {
  const contact = data.escalation.contactInfo;
  const rows: [string, string][] = [
    ["Nombre", contact?.name ?? "—"],
    ["Teléfono", contact?.phone ?? "—"],
    ["Correo", contact?.email ?? "—"],
    ["Autorizó sus datos", contact ? "Sí (Ley 1581)" : "—"],
    ["Pidió un asesor", formatDateTime(data.escalation.createdAt)],
    ["Mensajes", String(data.messages.length)],
  ];
  return (
    <aside
      aria-label="Detalles del caso"
      className="hidden w-[306px] flex-none border-l border-line px-6 pt-6 xl:block"
    >
      <h3 className="font-semibold">Contacto</h3>
      <dl className="mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-1.5">
            <dt className="text-muted">{label}</dt>
            <dd className="num truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
