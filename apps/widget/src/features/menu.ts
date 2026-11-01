import type { BotFeature } from "@alturia/shared";
import type { Option } from "../engine/types";
import type { Strings } from "../i18n/es";

/** Main menu, in display order. Only the bot's enabled features are shown. */
const MENU: {
  feature: BotFeature;
  label: (t: Strings) => string;
  icon: Option["icon"];
}[] = [
  {
    feature: "CERTIFICATES",
    label: (t) => t.menu.certificates,
    icon: "search",
  },
  { feature: "QR", label: (t) => t.menu.qr, icon: "qr" },
  {
    feature: "APPOINTMENTS",
    label: (t) => t.menu.appointments,
    icon: "calendar",
  },
  { feature: "FAQ", label: (t) => t.menu.faq, icon: "faq" },
  { feature: "HUMAN_HANDOFF", label: (t) => t.menu.handoff, icon: "advisor" },
];

export function mainMenuOptions(
  features: readonly BotFeature[],
  t: Strings,
): Option[] {
  return MENU.filter((item) => features.includes(item.feature)).map((item) => ({
    label: item.label(t),
    icon: item.icon,
    action: { type: "feature", feature: item.feature },
  }));
}

export const backToMenu = (t: Strings): Option => ({
  label: t.menu.back,
  icon: "back",
  action: { type: "menu" },
});
