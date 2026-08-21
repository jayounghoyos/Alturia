import { useState, type ReactNode } from "react";
import { clearToken } from "./api";
import { EscalationsPage } from "./EscalationsPage";
import { KnowledgePage } from "./KnowledgePage";

type Tab = "escalations" | "knowledge";

export function DashboardShell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("escalations");

  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
              AA
            </span>
            <div>
              <p className="font-bold text-ink">Asis Altura</p>
              <p className="text-xs text-muted">Admin panel</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <TabButton active={tab === "escalations"} onClick={() => setTab("escalations")}>
              Escalamientos
            </TabButton>
            <TabButton active={tab === "knowledge"} onClick={() => setTab("knowledge")}>
              Conocimiento
            </TabButton>
          </nav>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-ink hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-8">
        {tab === "escalations" ? <EscalationsPage /> : <KnowledgePage />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
