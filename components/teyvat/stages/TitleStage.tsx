"use client";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import { useI18n } from "@/i18n";

interface Props {
  palette: TierPalette;
  hasSavedAdventure: boolean;
  hasLibrary: boolean;
  onBegin: () => void;
  onResume: () => void;
  onOpenBookshelf: () => void;
}

export function TitleStage({
  palette,
  hasSavedAdventure,
  hasLibrary,
  onBegin,
  onResume,
  onOpenBookshelf,
}: Props) {
  const { t } = useI18n();

  const primaryBtn: React.CSSProperties = {
    display: "inline-block",
    padding: "14px 44px",
    border: `1px solid ${palette.gold}`,
    background: "transparent",
    color: palette.ink,
    fontFamily: "Georgia, serif",
    fontSize: 15,
    letterSpacing: "0.14em",
    cursor: "pointer",
    transition: "background 200ms",
  };

  const secondaryBtn: React.CSSProperties = {
    display: "inline-block",
    background: "transparent",
    border: "none",
    color: palette.inkSoft,
    fontFamily: "Georgia, serif",
    fontSize: 13,
    letterSpacing: "0.1em",
    cursor: "pointer",
    textDecoration: "underline",
    textDecorationColor: `${palette.gold}88`,
    padding: "6px 0",
  };

  const chevron: React.CSSProperties = {
    position: "absolute",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 22,
    color: palette.gold,
    opacity: 0.6,
    animation: "titleBob 2s ease-in-out infinite",
    userSelect: "none",
  };

  return (
    <StageWrapper tier="atmospheric" palette={palette}>
      <style>{`
        @keyframes titleBob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>

      {/* Atmospheric wash */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 30% 20%, ${palette.accent}18 0%, transparent 60%),
                     radial-gradient(ellipse at 70% 80%, ${palette.gold}18 0%, transparent 50%)`,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: 88,
          fontWeight: 300,
          letterSpacing: "0.16em",
          margin: 0,
          color: palette.ink,
          lineHeight: 1,
        }}>
          Destiny
        </h1>

        <p style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 15,
          letterSpacing: "0.12em",
          color: palette.inkSoft,
          margin: 0,
        }}>
          — a teyvat oracle —
        </p>

        <div style={{ height: 24 }} />

        {/* CTA row */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button style={primaryBtn} onClick={onBegin}>
            {t("begin")}
          </button>

          {hasSavedAdventure && (
            <button style={secondaryBtn} onClick={onResume}>
              ↩ {t("resume")}
            </button>
          )}

          {hasLibrary && (
            <button style={secondaryBtn} onClick={onOpenBookshelf}>
              ↘ {t("open_bookshelf")}
            </button>
          )}
        </div>
      </div>

      {/* Scroll chevron */}
      <div style={chevron} aria-hidden>↓</div>
    </StageWrapper>
  );
}
