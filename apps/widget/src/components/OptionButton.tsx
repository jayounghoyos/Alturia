import type { ReactNode } from "react";
import { ChevronRightIcon } from "../icons";

/** The white bordered row with icon + label + chevron used throughout the
 * mockups — main menu, FAQ chips, post-result follow-ups. */
export function OptionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-primary">
        {icon}
      </span>
      <span className="flex-1 font-semibold text-ink">{label}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
