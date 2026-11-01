import { CertificateCard } from "../components/CertificateCard";
import { ConfirmationCard } from "../components/ConfirmationCard";
import { OptionButton } from "../components/OptionButton";
import { QrScannerCard } from "../components/QrScannerCard";
import type { Msg, Option, OptionIcon } from "../engine/types";
import { es } from "../i18n/es";
import {
  AdvisorIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  DocumentIcon,
  FaqIcon,
  InfoIcon,
  PinIcon,
  QrIcon,
  SearchIcon,
  type LucideIcon,
} from "../icons";

const OPTION_ICONS: Record<OptionIcon, LucideIcon> = {
  search: SearchIcon,
  qr: QrIcon,
  calendar: CalendarIcon,
  faq: FaqIcon,
  advisor: AdvisorIcon,
  back: ArrowLeftIcon,
  info: InfoIcon,
  document: DocumentIcon,
  pin: PinIcon,
  check: CheckIcon,
};

export interface MessageHandlers {
  choose(messageId: string, index: number, option: Option): void;
  qrDecoded(messageId: string, payload: string): void;
  qrFallback?: (messageId: string) => void;
  removeMessage(messageId: string): void;
  scheduleRetraining(): void;
}

export function MessageView({
  message: m,
  handlers,
}: {
  message: Msg;
  handlers: MessageHandlers;
}) {
  switch (m.kind) {
    case "text":
      return (
        <div
          className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm ${
            m.from === "user"
              ? "ml-auto bg-primary text-primary-fg"
              : m.from === "advisor"
                ? "border border-primary bg-primary-soft text-ink"
                : "bg-bubble text-ink"
          }`}
        >
          {m.from === "advisor" && (
            <span className="mb-0.5 block text-xs font-semibold text-primary">
              {es.handoff.advisorPrefix}
            </span>
          )}
          {m.text}
        </div>
      );
    case "options":
      return (
        <div className="space-y-2">
          {m.options.map((option, index) => (
            <OptionButton
              key={`${index}-${option.label}`}
              icon={OPTION_ICONS[option.icon]}
              label={option.label}
              chosen={m.chosen === index}
              disabled={m.chosen !== undefined}
              onClick={() => handlers.choose(m.id, index, option)}
            />
          ))}
        </div>
      );
    case "certificate":
      return (
        <CertificateCard
          certificate={m.certificate}
          onScheduleRetraining={
            m.canScheduleRetraining ? handlers.scheduleRetraining : undefined
          }
        />
      );
    case "confirmation":
      return <ConfirmationCard confirmation={m.confirmation} />;
    case "qr":
      return (
        <QrScannerCard
          onClose={() => handlers.removeMessage(m.id)}
          onDecoded={(payload) => handlers.qrDecoded(m.id, payload)}
          onFallback={
            handlers.qrFallback ? () => handlers.qrFallback?.(m.id) : undefined
          }
        />
      );
  }
}
