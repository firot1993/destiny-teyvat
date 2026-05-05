import { ELEMENT_PALETTE, type Vision } from "@/lib/teyvat/elements";

export const FONT_DISPLAY = "'Cormorant Garamond', 'Times New Roman', serif";
export const FONT_BODY =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const PARCHMENT = "#f5ecd9";
export const INK = "#1f1b15";
export const INK_SOFT = "#4a4439";
export const INK_FAINT = "#8a8170";
export const BORDER_FAINT = "rgba(31,27,21,0.08)";
export const BORDER_SOFT = "rgba(31,27,21,0.16)";

export interface ThemeForVision {
  accent: string;
  tint: string;
  emphasis: string;
  text: string;
  mutedText: string;
  border: string;
}

export function themeForVision(vision: Vision): ThemeForVision {
  const palette = ELEMENT_PALETTE[vision];

  return {
    accent: palette.accent,
    tint: palette.tint,
    emphasis: palette.emphasis,
    text: INK,
    mutedText: INK_SOFT,
    border: `color-mix(in srgb, ${palette.accent} 22%, ${INK} 12%)`,
  };
}