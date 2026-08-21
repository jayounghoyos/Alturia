import { useEffect, useRef, useState } from "react";
import type { KnowledgeSourceRecord } from "@alturia/shared";
import { deleteKnowledge, fetchKnowledge, uploadKnowledge } from "./api";

export function KnowledgePage() {
  const [sources, setSources] = useState<KnowledgeSourceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetchKnowledge()
      .then(setSources)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const content = await file.text();
      await uploadKnowledge(file.name.replace(/\.md$/i, ""), content);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteKnowledge(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-bold text-ink">Contexto del bot</h1>
        <p className="text-sm text-muted">
          Sube un archivo .md con cómo quieres que se comporte el agente y qué debe saber
          (precios, políticas, tono). Se agrega al prompt del chat — sin necesitar que el
          cliente nos pase su manual de marca.
        </p>
      </div>

      <label className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center hover:border-primary">
        <span className="font-semibold text-primary">
          {uploading ? "Subiendo…" : "Elegir archivo .md"}
        </span>
        <span className="text-xs text-faint">Se reemplaza nada — puedes subir varios documentos</span>
        <input
          ref={fileRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : sources.length === 0 ? (
          <p className="p-6 text-sm text-muted">Todavía no se ha subido ningún documento.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{s.title}</p>
                  <p className="truncate text-xs text-faint">{s.content.slice(0, 100)}</p>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="ml-3 shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-danger hover:bg-danger-bg"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
