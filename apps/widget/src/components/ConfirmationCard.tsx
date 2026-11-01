import type { AppointmentConfirmation } from "@alturia/shared";
import { es, LOCALE } from "../i18n/es";
import { CheckIcon } from "../icons";
import { DetailRow } from "./DetailRow";

const t = es.appointments.card;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ConfirmationCard({
  confirmation,
}: {
  confirmation: AppointmentConfirmation;
}) {
  return (
    <div className="w-full rounded-2xl border border-line-soft bg-surface p-5 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg">
          <CheckIcon className="h-6 w-6 text-ok" />
        </span>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-faint">
          {t.code}
        </p>
        <p className="text-lg font-extrabold tracking-wide text-ink">
          {confirmation.confirmationCode}
        </p>
      </div>

      <dl className="mt-4 space-y-2 border-t border-line-soft pt-4 text-sm">
        <DetailRow label={t.course} value={confirmation.courseName} />
        <DetailRow label={t.date} value={formatDate(confirmation.date)} />
        <DetailRow label={t.time} value={confirmation.time} />
        <DetailRow label={t.location} value={confirmation.location} />
      </dl>
    </div>
  );
}
