import type { EscalationRecord } from "@alturia/shared";

const PILL: Record<
  EscalationRecord["status"],
  { label: string; className: string }
> = {
  OPEN: {
    label: "Sin responder",
    className: "bg-pill-warning-bg text-pill-warning-ink",
  },
  IN_PROGRESS: {
    label: "En curso",
    className: "bg-pill-neutral-bg text-pill-neutral-ink",
  },
  RESOLVED: {
    label: "Resuelto",
    className: "bg-pill-positive-bg text-pill-positive-ink",
  },
};

export function StatusPill({ status }: { status: EscalationRecord["status"] }) {
  const pill = PILL[status];
  return (
    <span
      className={`inline-flex h-5 flex-none items-center rounded-full px-2 text-xs font-medium whitespace-nowrap ${pill.className}`}
    >
      {pill.label}
    </span>
  );
}
