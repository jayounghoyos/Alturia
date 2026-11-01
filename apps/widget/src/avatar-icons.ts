import type { AvatarPreset } from "@alturia/shared";
import {
  Building2,
  HardHat,
  Headset,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** The bot avatar presets a client picks from in the dashboard (Lucide icons). */
export const AVATAR_ICONS: Record<AvatarPreset, LucideIcon> = {
  chat: MessageCircle,
  headset: Headset,
  "hard-hat": HardHat,
  shield: ShieldCheck,
  spark: Sparkles,
  building: Building2,
};
