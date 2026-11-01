export const LOCALE = "es-CO";

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
const numberFormat = new Intl.NumberFormat(LOCALE);

/** "hace 9 minutos", "ayer" — how long a visitor has been waiting. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 1) return "ahora";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const formatNumber = (n: number) => numberFormat.format(n);
