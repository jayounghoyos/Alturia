import type { BotConfig } from "@alturia/shared";
import { es } from "../i18n/es";
import { CloseIcon } from "../icons";
import { BotAvatar } from "./BotAvatar";

export function WidgetHeader({
  config,
  titleId,
  resolveUrl,
  onClose,
}: {
  config: BotConfig;
  titleId: string;
  resolveUrl: (path: string) => string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
      <BotAvatar config={config} resolveUrl={resolveUrl} />
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="truncate font-bold text-ink">
          {config.name}
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          {es.header.status}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={es.header.close}
        className="rounded-full p-1 text-icon hover:bg-line-soft hover:text-muted focus-visible:outline-2 focus-visible:outline-primary"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
