import type { BotConfig } from "@alturia/shared";
import { AVATAR_ICONS } from "../avatar-icons";

/** The client's uploaded logo, or the preset icon they picked. */
export function BotAvatar({
  config,
  resolveUrl,
  className = "h-10 w-10",
}: {
  config: BotConfig;
  resolveUrl: (path: string) => string;
  className?: string;
}) {
  if (config.avatarUrl) {
    return (
      <img
        src={resolveUrl(config.avatarUrl)}
        alt=""
        className={`${className} shrink-0 rounded-xl bg-surface object-cover`}
      />
    );
  }
  const Icon = AVATAR_ICONS[config.theme.avatarPreset];
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
