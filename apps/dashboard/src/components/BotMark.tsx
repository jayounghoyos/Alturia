import type { BotSettings } from "@alturia/shared";
import { AVATAR_ICONS } from "@alturia/widget/branding";
import { useAuth } from "../auth/auth-context";

/** The client's logo or avatar preset, as the widget shows it. */
export function BotMark({
  bot,
  src,
  size = 32,
}: {
  bot: Pick<BotSettings, "theme" | "avatarUrl" | "name">;
  /** Overrides the saved avatar (an unsaved upload in the Apariencia form). */
  src?: string | null;
  size?: number;
}) {
  const { api } = useAuth();
  const saved = src === undefined ? bot.avatarUrl : src;
  // Saved avatars are API paths; an unsaved upload is already a blob: URL.
  const image = saved && saved.startsWith("/") ? api.url(saved) : saved;
  const style = { width: size, height: size };
  if (image) {
    return (
      <img
        src={image}
        alt=""
        style={style}
        className="shrink-0 rounded-[6px] object-cover"
      />
    );
  }
  const Icon = AVATAR_ICONS[bot.theme.avatarPreset];
  return (
    <span
      style={{ ...style, backgroundColor: bot.theme.primaryColor }}
      className="flex shrink-0 items-center justify-center rounded-[6px] text-white"
    >
      <Icon size={Math.round(size * 0.55)} aria-hidden />
    </span>
  );
}
