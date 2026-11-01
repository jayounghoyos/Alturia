import type { CertificateLookup } from "@alturia/shared";
import { es, LOCALE } from "../i18n/es";
import { WarningIcon } from "../icons";
import { DetailRow } from "./DetailRow";
import { StatusBadge } from "./StatusBadge";

const t = es.certificates.card;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysRemaining(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

export function CertificateCard({
  certificate,
  onScheduleRetraining,
}: {
  certificate: CertificateLookup;
  onScheduleRetraining?: () => void;
}) {
  const isValid = certificate.status === "VALID";

  return (
    <div className="w-full rounded-2xl border border-line-soft bg-surface p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        {certificate.expirationType === "COURSE" ? t.course : t.medical}
      </p>
      <StatusBadge status={certificate.status} />

      <dl className="mt-3 space-y-2 text-sm">
        {isValid ? (
          <>
            <DetailRow
              label={t.validUntil}
              value={formatDate(certificate.expiresAt)}
            />
            <DetailRow
              label={t.daysLeft}
              value={t.days(daysRemaining(certificate.expiresAt))}
            />
          </>
        ) : (
          <>
            <DetailRow
              label={t.expiredOn}
              value={formatDate(certificate.expiresAt)}
            />
            <DetailRow label={t.status} value={t.needsRenewal} />
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-faint">{t.privacy}</p>

      {!isValid && onScheduleRetraining && (
        <>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-sm text-warn">
            <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t.reminder}</span>
          </div>
          <button
            type="button"
            onClick={onScheduleRetraining}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-center font-semibold text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t.scheduleRetraining}
          </button>
        </>
      )}
    </div>
  );
}
