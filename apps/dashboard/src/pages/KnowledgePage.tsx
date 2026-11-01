import {
  knowledgeContext,
  MAX_KNOWLEDGE_CONTEXT_CHARS,
  type KnowledgeSourceRecord,
} from "@alturia/shared";
import { Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "../auth/auth-context";
import { BlockError } from "../components/BlockError";
import { formatDateTime, formatNumber } from "../lib/format";
import { useAsync } from "../lib/useAsync";

/**
 * Documents the assistant reads before answering. The usage bar is the screen's
 * answer: how much of the prompt the documents fill, since text past the limit
 * never reaches the assistant.
 */
export function KnowledgePage() {
  const { api } = useAuth();
  const docs = useAsync(() => api.listKnowledge(), "knowledge");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.addKnowledge(
        file.name.replace(/\.(md|txt)$/i, ""),
        await file.text(),
      );
      docs.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se subió «${file.name}»: ${err.message}`
          : `No se subió «${file.name}».`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove(doc: KnowledgeSourceRecord) {
    setConfirming(null);
    try {
      await api.deleteKnowledge(doc.id);
      docs.reload();
    } catch {
      setError(`No se eliminó «${doc.title}». Intenta de nuevo.`);
    }
  }

  // Oldest first, the order the API joins them into the prompt.
  const list = (docs.data ?? []).toSorted((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const used = knowledgeContext(list).length;

  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-7 font-semibold">Conocimiento</h1>
          <p className="mt-1 max-w-[60ch] text-muted">
            Lo que tu asistente lee antes de responder: horarios, precios,
            políticas. Sube archivos .md o .txt; se usan en orden, del más
            antiguo al más reciente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-8 items-center gap-1.5 rounded-control bg-primary px-3 font-medium text-white hover:bg-black disabled:opacity-60"
        >
          <Upload size={14} aria-hidden />
          {uploading ? "Subiendo…" : "Subir documento"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          onChange={(e) => void upload(e)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {docs.data && <ContextUsage used={used} />}

      {error && (
        <p role="alert" className="mt-4 text-negative">
          {error}
        </p>
      )}

      <section aria-labelledby="docs-title" className="mt-6">
        <h2 id="docs-title" className="font-semibold">
          Documentos{docs.data ? ` (${list.length})` : ""}
        </h2>
        {docs.error && !docs.data ? (
          <div className="mt-3">
            <BlockError
              message="No pudimos cargar los documentos."
              onRetry={docs.reload}
            />
          </div>
        ) : !docs.data ? (
          <p className="mt-3 h-12 rounded-card bg-raised" aria-busy="true" />
        ) : list.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-line px-4 py-3 text-muted">
            Aún no hay documentos. Sin ellos, el asistente solo usa su
            personalidad (en Apariencia).
          </p>
        ) : (
          <ul className="mt-2">
            {list.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-4 border-b border-rule py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted">
                    {formatDateTime(doc.createdAt)} · {doc.content.slice(0, 90)}
                  </p>
                </div>
                <span className="num flex-none text-right text-muted">
                  {formatNumber(doc.content.length)} car.
                </span>
                {confirming === doc.id ? (
                  <span className="flex flex-none items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void remove(doc)}
                      className="font-medium text-negative"
                    >
                      Eliminar «{doc.title}»
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-muted"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(doc.id)}
                    className="flex-none text-muted hover:text-negative"
                  >
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ContextUsage({ used }: { used: number }) {
  const max = MAX_KNOWLEDGE_CONTEXT_CHARS;
  const over = used > max;
  const ratio = Math.min(used / max, 1);
  return (
    <section
      aria-labelledby="usage-title"
      className="mt-6 rounded-card border border-line p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="usage-title" className="font-semibold">
          Espacio que lee el asistente
        </h2>
        <p className="num">
          <span className="text-[22px] font-semibold">
            {formatNumber(used)}
          </span>
          <span className="text-muted"> de {formatNumber(max)} caracteres</span>
        </p>
      </div>
      <div
        aria-hidden="true"
        className="mt-3 h-2 overflow-hidden rounded-full bg-raised"
      >
        <div
          className={`h-full rounded-full ${over ? "bg-negative" : "bg-accent"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className={`mt-2 ${over ? "text-negative" : "text-muted"}`}>
        {over
          ? `Sobran ${formatNumber(used - max)} caracteres: el final del último documento no le llega al asistente. Resume o elimina algo.`
          : `Quedan ${formatNumber(max - used)} caracteres libres.`}
      </p>
    </section>
  );
}
