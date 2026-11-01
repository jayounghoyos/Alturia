import type { EscalationRecord } from "@alturia/shared";
import { RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router";
import { BlockError } from "../components/BlockError";
import { StatusPill } from "../components/StatusPill";
import { formatTime, timeAgo } from "../lib/format";
import { useBot } from "../shell/bot-context";
import { EscalationThread } from "./EscalationThread";

/**
 * The inbox answers "who is waiting for a person, and since when?": the queue
 * on the left, oldest first, and the open conversation beside it.
 */
export function EscalationsPage() {
  const { id } = useParams();
  const { inbox } = useBot();
  const cases = oldestFirst(inbox.cases ?? []);

  return (
    <div className="flex min-h-[calc(100dvh-48px)] lg:h-[calc(100dvh-18px)] lg:min-h-0">
      <section
        aria-labelledby="inbox-title"
        className={`flex w-full flex-col border-line lg:w-[384px] lg:flex-none lg:border-r ${
          id ? "hidden lg:flex" : "flex"
        }`}
      >
        <header className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h1
              id="inbox-title"
              className="text-[22px] leading-7 font-semibold"
            >
              Escalamientos
            </h1>
            <button
              type="button"
              onClick={inbox.reload}
              className="flex h-8 items-center gap-1.5 rounded-control px-2 text-muted hover:bg-raised hover:text-ink"
            >
              <RefreshCw
                size={14}
                aria-hidden
                className={inbox.loading ? "animate-spin" : ""}
              />
              {inbox.updatedAt ? formatTime(inbox.updatedAt) : "Actualizar"}
            </button>
          </div>
          <p className="mt-1 text-muted">{finding(cases)}</p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {inbox.error && !inbox.cases ? (
            <div className="px-6">
              <BlockError
                message="No pudimos cargar los casos."
                onRetry={inbox.reload}
              />
            </div>
          ) : !inbox.cases ? (
            <ul aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="mx-3 h-[72px] border-b border-rule px-3 py-3"
                >
                  <span className="block h-3.5 w-32 rounded bg-raised" />
                  <span className="mt-2.5 block h-3.5 w-52 rounded bg-raised" />
                </li>
              ))}
            </ul>
          ) : cases.length === 0 ? (
            <p className="mx-6 rounded-card border border-dashed border-line px-4 py-3 text-muted">
              Nadie está esperando a un asesor. Cuando alguien lo pida desde el
              chat, aparece aquí.
            </p>
          ) : (
            <ul>
              {cases.map((c) => (
                <li key={c.id}>
                  <CaseRow item={c} selected={c.id === id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        aria-label="Conversación"
        className={`min-w-0 flex-1 ${id ? "flex" : "hidden lg:flex"}`}
      >
        {id ? (
          <EscalationThread key={id} id={id} />
        ) : (
          <p className="m-auto max-w-xs text-center text-muted">
            Elige un caso para leer la conversación y responder.
          </p>
        )}
      </section>
    </div>
  );
}

function CaseRow({
  item,
  selected,
}: {
  item: EscalationRecord;
  selected: boolean;
}) {
  const who = item.contactInfo?.name ?? "Visitante";
  return (
    <Link
      to={`/escalamientos/${item.id}`}
      aria-current={selected ? "page" : undefined}
      className={`mx-3 block rounded-control px-3 py-3 ${
        selected ? "bg-active" : "hover:bg-raised"
      }`}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span
          className={`truncate ${item.status === "OPEN" ? "font-semibold" : "font-medium"}`}
        >
          {who}
        </span>
        <span className="flex-none text-xs text-muted">
          {timeAgo(item.createdAt)}
        </span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-3">
        <span className="truncate text-muted">{item.reason}</span>
        <StatusPill status={item.status} />
      </span>
    </Link>
  );
}

function oldestFirst(cases: EscalationRecord[]): EscalationRecord[] {
  return cases.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The one line under the title: how many wait, and the longest wait. */
function finding(cases: EscalationRecord[]): string {
  const unanswered = cases.filter((c) => c.status === "OPEN");
  if (cases.length === 0) return "Sin casos abiertos.";
  const oldest = unanswered[0] ?? cases[0];
  const count =
    unanswered.length === 1
      ? "1 persona sin respuesta"
      : `${unanswered.length} personas sin respuesta`;
  return oldest
    ? `${count} · la más antigua desde ${timeAgo(oldest.createdAt)}`
    : count;
}
