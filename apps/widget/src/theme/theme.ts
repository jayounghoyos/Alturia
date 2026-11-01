import type { BotTheme } from "@alturia/shared";

const FALLBACK_PRIMARY = "#0180e1";

/** sRGB relative luminance (WCAG 2.x). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi = 0, lo = 0] = [
    relativeLuminance(a),
    relativeLuminance(b),
  ].toSorted((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black text, whichever reads better on the brand colour. */
export function readableTextOn(background: string): "#ffffff" | "#0b0f14" {
  return contrastRatio(background, "#ffffff") >=
    contrastRatio(background, "#0b0f14")
    ? "#ffffff"
    : "#0b0f14";
}

/**
 * CSS custom properties for a bot's brand. Set on the widget's mount element,
 * they override the defaults in widget.css for everything inside it.
 */
export function themeVariables(theme: BotTheme): Record<string, string> {
  const primary = isHex(theme.primaryColor)
    ? theme.primaryColor
    : FALLBACK_PRIMARY;
  return {
    "--color-primary": primary,
    "--color-primary-fg": readableTextOn(primary),
    "--color-primary-soft": `color-mix(in srgb, ${primary} 12%, white)`,
  };
}

export function applyTheme(element: HTMLElement, theme: BotTheme): void {
  for (const [name, value] of Object.entries(themeVariables(theme))) {
    element.style.setProperty(name, value);
  }
}

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function parseHex(hex: string): [number, number, number] {
  const value = isHex(hex) ? hex : FALLBACK_PRIMARY;
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}
