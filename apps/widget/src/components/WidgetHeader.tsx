import { CloseIcon, HardHatIcon } from "../icons";

export function WidgetHeader({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <HardHatIcon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-bold text-ink">{name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          En línea · Responde al instante
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar chat"
        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
