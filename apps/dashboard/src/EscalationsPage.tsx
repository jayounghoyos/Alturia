import { useEffect, useState } from "react";
import type { EscalationRecord } from "@alturia/shared";
import { clearToken, fetchEscalations } from "./api";

const STATUS_STYLES: Record<EscalationRecord["status"], string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
};

export function EscalationsPage({ onLogout }: { onLogout: () => void }) {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchEscalations()
      .then(setEscalations)
      .catch((err: Error) => {
        setError(err.message);
        if (err.message.includes("expired")) onLogout();
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Escalation inbox</h1>
            <p className="text-sm text-slate-500">Open and in-progress cases from the chat</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : escalations.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No open escalations right now.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escalations.map((e) => (
                  <tr key={e.id}>
                    <td className="max-w-xs px-4 py-3 text-slate-800">{e.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.contactInfo ? e.contactInfo.name : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
