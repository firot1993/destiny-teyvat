"use client";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";

interface Props {
  palette: TierPalette;
  chapterEyebrow: string;   // e.g. "Chapter I"
  chapterTitle: string;     // e.g. "Mood"
  chapterSubtitle: string;  // e.g. "How you carry yourself..."
  visionLabel: string;      // e.g. "Anemo"
}

export function ChapterIntroStage({
  palette,
  chapterEyebrow,
  chapterTitle,
  chapterSubtitle,
}: Props) {
  const chevron: React.CSSProperties = {
    position: "absolute",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 22,
    color: palette.gold,
    opacity: 0.6,
    animation: "chapterBob 2s ease-in-out infinite",
    userSelect: "none",
  };

  const scrollUpHint: React.CSSProperties = {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 18,
    color: palette.gold,
    opacity: 0.4,
    userSelect: "none",
  };

  return (
    <StageWrapper tier="atmospheric" palette={palette}>
      <style>{`
        @keyframes chapterBob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>

      {/* Atmospheric wash */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 60% 25%, ${palette.accent}14 0%, transparent 55%),
                     radial-gradient(ellipse at 40% 75%, ${palette.gold}10 0%, transparent 45%)`,
      }} />

      <div style={scrollUpHint} aria-hidden>↑</div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 12,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: palette.gold,
          margin: 0,
        }}>
          {chapterEyebrow}
        </p>

        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: 64,
          fontWeight: 300,
          letterSpacing: "0.08em",
          color: palette.ink,
          margin: 0,
          lineHeight: 1.1,
        }}>
          {chapterTitle}
        </h2>

        <p style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 16,
          letterSpacing: "0.06em",
          color: palette.inkSoft,
          margin: 0,
          maxWidth: 420,
        }}>
          {chapterSubtitle}
        </p>
      </div>

      <div style={chevron} aria-hidden>↓</div>
    </StageWrapper>
  );
}
