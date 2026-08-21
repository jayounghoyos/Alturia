import type { CertificateLookup } from "@alturia/shared";
import { StatusBadge } from "./StatusBadge";
import { WarningIcon } from "../icons";

const TYPE_LABEL: Record<CertificateLookup["expirationType"], string> = {
  COURSE: "Certificado de curso",
  MEDICAL_EXAM: "Examen médico ocupacional",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysRemaining(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
    <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        {TYPE_LABEL[certificate.expirationType]}
      </p>
      <StatusBadge status={certificate.status} />

      <dl className="mt-3 space-y-2 text-sm">
        {isValid ? (
          <>
            <Row label="Vigente hasta" value={formatDate(certificate.expiresAt)} />
            <Row label="Días restantes" value={`${daysRemaining(certificate.expiresAt)} días`} />
          </>
        ) : (
          <>
            <Row label="Venció el" value={formatDate(certificate.expiresAt)} />
            <Row label="Estado" value="Requiere renovación" />
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-faint">
        Por seguridad solo se muestra el estado y la fecha de vencimiento.
      </p>

      {!isValid && onScheduleRetraining && (
        <>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-sm text-warn">
            <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Enviamos un aviso automático 30 días antes de cada vencimiento.</span>
          </div>
          <button
            onClick={onScheduleRetraining}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
          >
            Agendar reentrenamiento →
          </button>
        </>
      )}
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
