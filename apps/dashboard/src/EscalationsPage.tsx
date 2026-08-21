import { useEffect, useState } from "react";
import type { EscalationRecord } from "@alturia/shared";
import { fetchEscalations } from "./api";
import { EscalationDetail } from "./EscalationDetail";

const STATUS_STYLES: Record<EscalationRecord["status"], string> = {
  OPEN: "bg-warn-bg text-warn",
  IN_PROGRESS: "bg-blue-100 text-primary",
  RESOLVED: "bg-ok-bg text-ok",
};

export function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchEscalations()
      .then(setEscalations)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (selectedId) {
    return (
      <EscalationDetail
        id={selectedId}
        onBack={() => {
          setSelectedId(null);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-ink">Escalation inbox</h1>
          <p className="text-sm text-muted">Open and in-progress cases from the chat</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-ink hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : escalations.length === 0 ? (
          <p className="p-6 text-sm text-muted">No open escalations right now.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escalations.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="max-w-xs px-4 py-3 text-ink">{e.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{e.contactInfo ? e.contactInfo.name : "—"}</td>
                  <td className="px-4 py-3 text-faint">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
