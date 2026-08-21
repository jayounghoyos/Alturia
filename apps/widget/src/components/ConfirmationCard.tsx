import type { AppointmentConfirmation } from "@alturia/shared";
import { CheckIcon } from "../icons";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ConfirmationCard({ confirmation }: { confirmation: AppointmentConfirmation }) {
  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg">
          <CheckIcon className="h-6 w-6 text-ok" />
        </span>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-faint">
          Código de reserva
        </p>
        <p className="text-lg font-extrabold tracking-wide text-ink">
          {confirmation.confirmationCode}
        </p>
      </div>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <Row label="Curso" value={confirmation.courseName} />
        <Row label="Fecha" value={formatDate(confirmation.date)} />
        <Row label="Hora" value={confirmation.time} />
        <Row label="Sede" value={confirmation.location} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
