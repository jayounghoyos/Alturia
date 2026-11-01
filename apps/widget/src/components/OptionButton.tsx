import type { LucideIcon } from "../icons";
import { ChevronRightIcon } from "../icons";

/** Icon + label + chevron row: main menu, FAQ chips, follow-ups. */
export function OptionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  chosen = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  chosen?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={chosen || undefined}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default ${
        chosen
          ? "border-primary bg-primary-soft"
          : "border-line bg-surface enabled:hover:border-icon enabled:hover:bg-surface-muted disabled:opacity-60"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 font-semibold text-ink">{label}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-icon" />
    </button>
  );
}
