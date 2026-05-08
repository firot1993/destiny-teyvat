// components/teyvat/stages/StageWrapper.tsx
"use client";
import type { TierPalette, StageTier } from "@/lib/teyvat/stageTiers";

interface Props {
  tier: StageTier;
  palette: TierPalette;
  /** Variable height — true for scenes that may overflow, false for fixed 100vh. */
  scrollable?: boolean;
  /** True when stage should be styled as locked/sealed (post-reveal questionnaire). */
  sealed?: boolean;
  children: React.ReactNode;
}

export function StageWrapper({ tier, palette, scrollable = false, sealed = false, children }: Props) {
  return (
    <section style={{
      minHeight: "100vh",
      scrollSnapAlign: "start",
      scrollSnapStop: "normal",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: scrollable ? "flex-start" : "center",
      alignItems: "center",
      padding: scrollable ? "60px 28px 100px" : "60px 28px 80px",
      textAlign: "center",
      overflow: "hidden",
      background: palette.ground,
      color: palette.ink,
      transition: "background 600ms ease, color 400ms ease",
      filter: sealed ? "grayscale(0.4) opacity(0.6)" : undefined,
      pointerEvents: sealed ? "none" : undefined,
    }}>
      {children}
    </section>
  );
}
