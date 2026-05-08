"use client";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { AdventureState } from "@/lib/teyvat/scenes";
import type { Language } from "@/types";
import { useI18n } from "@/i18n";

interface Props {
  palette: TierPalette;
  state: AdventureState;
  language: Language;
  hasLibrary: boolean;
  onNewRun: () => void;
  onOpenBookshelf: () => void;
}

export function EndingStage({
  palette,
  state,
  language: _language,
  hasLibrary,
  onNewRun,
  onOpenBookshelf,
}: Props) {
  const { t } = useI18n();

  const charName = state.character.name;
  const isUserStopped = state.endedBy === "user";

  const blurb = isUserStopped
    ? `${charName}'s story pauses here, suspended between one breath and the next.`
    : `${charName}'s story finds its close — not in silence, but in the quiet that follows a full breath.`;

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
      {/* Atmospheric wash */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 50%, ${palette.accent}12 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 10%, ${palette.gold}10 0%, transparent 40%)`,
      }} />

      <div style={scrollUpHint} aria-hidden>↑</div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: palette.gold,
          margin: 0,
        }}>
          — end of the run —
        </p>

        {/* Display title */}
        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: 52,
          fontWeight: 300,
          letterSpacing: "0.06em",
          color: palette.ink,
          margin: 0,
          lineHeight: 1.1,
        }}>
          Dawn after
        </h2>

        {/* Blurb */}
        <p style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.7,
          color: palette.inkSoft,
          margin: 0,
          maxWidth: 400,
        }}>
          {blurb}
        </p>

        <div style={{ height: 16 }} />

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button style={primaryBtn} onClick={onNewRun}>
            {t("walk_different_path")}
          </button>

          {hasLibrary && (
            <button style={secondaryBtn} onClick={onOpenBookshelf}>
              ↘ {t("open_bookshelf")}
            </button>
          )}
        </div>
      </div>
    </StageWrapper>
  );
}
