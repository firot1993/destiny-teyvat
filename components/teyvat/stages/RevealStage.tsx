"use client";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { ParsedDirection } from "@/lib/teyvat/candidates";
import type { Language } from "@/types";

interface Props {
  palette: TierPalette;
  loading: boolean;
  character: RevealedCharacter | null;
  fatedCharacter: CanonCharacter | null;
  imageUrl: string | null;
  revealReason: string | null;
  directions: ParsedDirection[] | null;
  language: Language;
  onAdvance: () => void;
  onPickDirection: (id: string) => void;
  onCommit: () => void;
  committed: boolean;
}

export function RevealStage({
  palette,
  loading,
  character,
  fatedCharacter,
  imageUrl,
  revealReason,
  directions,
  language,
  onAdvance,
  onPickDirection,
  onCommit,
  committed,
}: Props) {
  const isWish = directions !== null;

  const displayName = isWish
    ? (language === "zh" && fatedCharacter?.nameZh ? fatedCharacter.nameZh : fatedCharacter?.nameEn ?? "")
    : character?.name ?? "";

  const displayTitle = character?.title ?? "";

  const primaryBtn: React.CSSProperties = {
    display: "inline-block",
    padding: "14px 44px",
    border: `1px solid ${palette.goldBright}`,
    background: "transparent",
    color: palette.ink,
    fontFamily: "Georgia, serif",
    fontSize: 15,
    letterSpacing: "0.14em",
    cursor: "pointer",
  };

  const directionCard: React.CSSProperties = {
    border: `1px solid ${palette.goldBright}55`,
    borderRadius: 4,
    padding: "18px 20px",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 200ms, background 200ms",
    maxWidth: 320,
    width: "100%",
  };

  return (
    <StageWrapper tier="theatrical" palette={palette}>
      {/* Background glow effects */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 30%, ${palette.accent}20 0%, transparent 60%),
                     radial-gradient(ellipse at 50% 90%, ${palette.accentDeep}15 0%, transparent 40%)`,
      }} />

      {/* Silhouette / portrait area */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 240,
        height: 360,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: imageUrl ? 1 : 0.3,
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            background: palette.silhouette ?? `linear-gradient(180deg, ${palette.accent} 0%, ${palette.accentDeep} 80%, transparent 100%)`,
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 200 }}>
        {/* Vision badge */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2px solid ${palette.accent}`,
          boxShadow: `0 0 16px ${palette.accent}60`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          color: palette.accent,
          background: `${palette.accentDeep}30`,
          marginBottom: 4,
        }}>
          ✦
        </div>

        {loading ? (
          <>
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: palette.inkSoft, fontSize: 14, letterSpacing: "0.1em" }}>
              the wind is listening…
            </p>
            <style>{`
              @keyframes breathe {
                0%, 100% { opacity: 0.2; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.4); }
              }
            `}</style>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: palette.accent,
                  animation: `breathe 1.8s ease-in-out ${i * 0.32}s infinite`,
                }} />
              ))}
            </div>
          </>
        ) : !committed && !character && !fatedCharacter ? (
          /* Commit gate */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: palette.inkSoft, fontSize: 15, letterSpacing: "0.06em", maxWidth: 320 }}>
              The stars have read your answers. Are you ready to learn your fate?
            </p>
            <button style={primaryBtn} onClick={onCommit}>
              Reveal my destiny
            </button>
          </div>
        ) : (
          <>
            {/* Name + epithet */}
            <h2 style={{
              fontFamily: "Georgia, serif",
              fontSize: 64,
              fontWeight: 300,
              letterSpacing: "0.06em",
              color: palette.ink,
              margin: 0,
              lineHeight: 1,
            }}>
              {displayName}
            </h2>

            {displayTitle && (
              <p style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 16,
                letterSpacing: "0.08em",
                color: palette.goldBright,
                margin: 0,
              }}>
                {language === "zh" ? `「${displayTitle}」` : `— ${displayTitle} —`}
              </p>
            )}

            {/* Nation row */}
            {(character?.nation || fatedCharacter?.nation) && (
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {[character?.nation ?? fatedCharacter?.nation, character?.vision ?? fatedCharacter?.vision, character?.weapon ?? fatedCharacter?.weapon]
                  .filter(Boolean)
                  .map((chip) => (
                    <span key={chip} style={{
                      padding: "3px 10px",
                      border: `1px solid ${palette.gold}60`,
                      borderRadius: 20,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: palette.inkSoft,
                    }}>
                      {chip}
                    </span>
                  ))}
              </div>
            )}

            {/* v2-wish: why this one + directions */}
            {isWish && directions ? (
              <>
                {revealReason && (
                  <div style={{ maxWidth: 440, marginTop: 12 }}>
                    <p style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: palette.inkSoft,
                      margin: 0,
                    }}>
                      {revealReason}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, width: "100%", alignItems: "center" }}>
                  {directions.map((dir) => (
                    <button key={dir.id} style={directionCard} onClick={() => onPickDirection(dir.id)}>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 500, color: palette.ink, margin: "0 0 6px" }}>
                        {dir.title}
                      </p>
                      <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: palette.inkSoft, margin: 0, lineHeight: 1.6 }}>
                        {dir.hook}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Single-character: advance affordance */
              <button style={{ ...primaryBtn, marginTop: 16 }} onClick={onAdvance}>
                Walk into her world ↓
              </button>
            )}
          </>
        )}
      </div>
    </StageWrapper>
  );
}
