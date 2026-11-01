import {
  BookText,
  Inbox,
  LogOut,
  Menu,
  Mountain,
  Palette,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/auth-context";
import { BotMark } from "../components/BotMark";
import { useBot } from "./bot-context";

const NAV: { to: string; label: string; icon: LucideIcon; count?: true }[] = [
  { to: "/escalamientos", label: "Escalamientos", icon: Inbox, count: true },
  { to: "/conocimiento", label: "Conocimiento", icon: BookText },
  { to: "/apariencia", label: "Apariencia", icon: Palette },
];

/**
 * "Framed sheet" shell: the sidebar sits on the tinted frame, the screen on a
 * white sheet inset 8px from the window. On a phone the frame folds into a
 * 48px top bar with a menu sheet.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = NAV.find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-dvh bg-ground lg:flex">
      {/* Phone and tablet: top bar */}
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 bg-ground px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-ink"
        >
          <Menu size={20} aria-hidden />
        </button>
        <span className="font-semibold">{current?.label ?? "AlturiaBot"}</span>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-ground lg:hidden">
          <div className="flex h-12 items-center justify-end px-2">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-ink"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <aside className="hidden w-[228px] shrink-0 lg:block">
        <div className="sticky top-0 h-dvh">
          <Sidebar />
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-surface lg:my-2 lg:mr-2 lg:min-h-[calc(100dvh-16px)] lg:rounded-sheet lg:border lg:border-line">
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useAuth();
  const { bot, inbox } = useBot();
  const waiting = inbox.cases?.length;

  return (
    <nav aria-label="Principal" className="flex h-full flex-col px-3 py-4">
      <p className="flex items-center gap-2 px-2 font-semibold">
        <Mountain size={18} className="text-accent" aria-hidden />
        AlturiaBot
      </p>

      <div className="mt-5 flex items-center gap-2.5 rounded-control px-2 py-1.5">
        {bot ? (
          <BotMark bot={bot} size={28} />
        ) : (
          <span className="h-7 w-7 rounded-[6px] bg-active" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{bot?.name ?? " "}</p>
          <p className="truncate text-xs text-muted">Tu asistente</p>
        </div>
      </div>

      <ul className="mt-5 space-y-0.5">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex h-10 items-center gap-2.5 rounded-control px-2 lg:h-8 ${
                  isActive ? "bg-active text-ink" : "text-muted hover:text-ink"
                }`
              }
            >
              <item.icon size={16} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.count && waiting !== undefined && waiting > 0 && (
                <span
                  className="num text-xs text-ink"
                  aria-label={`${waiting} esperando`}
                >
                  {waiting}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-2 px-2 pt-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{admin?.name}</p>
          <p className="truncate text-xs text-muted">{admin?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-active hover:text-ink"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
