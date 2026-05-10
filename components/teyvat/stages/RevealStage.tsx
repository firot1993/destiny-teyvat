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
  enteringWorld?: boolean;
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
  enteringWorld = false,
}: Props) {
  const isWish = directions !== null;
  const enteringWorldLabel = language === "zh" ? "正在打开前路..." : "Opening the path...";

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
    padding: "16px 18px",
    background: "rgba(255,255,255,0.04)",
    cursor: enteringWorld ? "wait" : "pointer",
    textAlign: "left",
    transition: "border-color 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    width: "100%",
    opacity: enteringWorld ? 0.58 : 1,
  };

  return (
    <StageWrapper tier="theatrical" palette={palette}>
      <style>{`
        @media (max-width: 860px) {
          [data-reveal-layout] {
            grid-template-columns: 1fr !important;
            width: min(560px, calc(100vw - 40px)) !important;
            min-height: auto !important;
            gap: 24px !important;
            padding-block: 24px !important;
          }

          [data-reveal-portrait] {
            justify-self: center !important;
            width: min(260px, 74vw) !important;
          }

          [data-reveal-copy] {
            align-items: center !important;
            text-align: center !important;
          }

          [data-reveal-meta] {
            justify-content: center !important;
          }
        }

        @keyframes revealPathOpen {
          0% { transform: scaleX(0.18); opacity: 0.32; }
          50% { transform: scaleX(1); opacity: 0.92; }
          100% { transform: scaleX(0.18); opacity: 0.32; }
        }

        @keyframes revealPulseSoft {
          0%, 100% { opacity: 0.42; transform: translateX(-4px); }
          50% { opacity: 1; transform: translateX(4px); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-reveal-entry-feedback] * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Background glow effects */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 30%, ${palette.accent}20 0%, transparent 60%),
                     radial-gradient(ellipse at 50% 90%, ${palette.accentDeep}15 0%, transparent 40%)`,
      }} />

      {loading ? (
        <div style={centeredRevealContent}>
          <div style={visionBadgeStyle(palette)}>
            ✦
          </div>
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
        </div>
      ) : !committed && !character && !fatedCharacter ? (
        /* Commit gate */
        <div style={centeredRevealContent}>
          <div style={visionBadgeStyle(palette)}>
            ✦
          </div>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: palette.inkSoft, fontSize: 15, letterSpacing: "0.06em", maxWidth: 320 }}>
            The stars have read your answers. Are you ready to learn your fate?
          </p>
          <button style={primaryBtn} onClick={onCommit}>
            Reveal my destiny
          </button>
        </div>
      ) : (
        <div data-testid="reveal-layout" data-reveal-layout style={revealLayoutStyle}>
          {/* Silhouette / portrait area */}
          <div data-testid="reveal-portrait" data-reveal-portrait style={portraitFrameStyle(palette, Boolean(imageUrl))}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                background: palette.silhouette ?? `linear-gradient(180deg, ${palette.accent} 0%, ${palette.accentDeep} 80%, transparent 100%)`,
              }} />
            )}
          </div>

          {/* Content */}
          <div data-testid="reveal-copy" data-reveal-copy style={revealCopyStyle}>
            {/* Name + epithet */}
            <h2 style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(44px, 5vw, 72px)",
              fontWeight: 300,
              letterSpacing: "0.04em",
              color: palette.ink,
              margin: 0,
              lineHeight: 1,
              textWrap: "balance",
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
              <div data-reveal-meta style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
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
                  <div style={{ maxWidth: 560, marginTop: 8 }}>
                    <p style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 15,
                      lineHeight: 1.75,
                      color: palette.inkSoft,
                      margin: 0,
                    }}>
                      {revealReason}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10, width: "100%" }}>
                  {directions.map((dir) => (
                    <button
                      key={dir.id}
                      style={directionCard}
                      onClick={() => !enteringWorld && onPickDirection(dir.id)}
                      disabled={enteringWorld}
                      aria-busy={enteringWorld}
                    >
                      <p style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 500, color: palette.ink, margin: "0 0 6px" }}>
                        {dir.title}
                      </p>
                      <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: palette.inkSoft, margin: 0, lineHeight: 1.6 }}>
                        {dir.hook}
                      </p>
                    </button>
                  ))}
                </div>
                {enteringWorld && (
                  <EntryProgress palette={palette} label={enteringWorldLabel} />
                )}
              </>
            ) : (
              /* Single-character: advance affordance */
              <div data-reveal-entry-feedback style={entryFeedbackStyle}>
                <button
                  style={{
                    ...primaryBtn,
                    marginTop: 16,
                    cursor: enteringWorld ? "wait" : "pointer",
                    opacity: enteringWorld ? 0.72 : 1,
                  }}
                  onClick={() => !enteringWorld && onAdvance()}
                  disabled={enteringWorld}
                  aria-busy={enteringWorld}
                >
                  {enteringWorld ? enteringWorldLabel : "Walk into her world ↓"}
                </button>
                {enteringWorld && (
                  <EntryProgress palette={palette} label={enteringWorldLabel} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </StageWrapper>
  );
}

function EntryProgress({ palette, label }: { palette: TierPalette; label: string }) {
  return (
    <div role="status" aria-live="polite" style={entryStatusStyle(palette)}>
      <span style={entryPathLineStyle(palette)} />
      <span>{label}</span>
      <span aria-hidden="true" style={entryPulseStyle(palette)}>✦</span>
    </div>
  );
}

const centeredRevealContent: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
};

const revealLayoutStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "min(1120px, calc(100vw - 72px))",
  minHeight: "min(680px, calc(100vh - 140px))",
  display: "grid",
  gridTemplateColumns: "minmax(280px, 0.86fr) minmax(360px, 1fr)",
  alignItems: "center",
  gap: "clamp(36px, 5vw, 88px)",
  textAlign: "left",
};

const revealCopyStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 14,
  maxWidth: 580,
  minWidth: 0,
  textAlign: "left",
};

const entryFeedbackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 12,
  width: "100%",
};

function entryStatusStyle(palette: TierPalette): React.CSSProperties {
  return {
    width: "min(360px, 100%)",
    display: "grid",
    gridTemplateColumns: "minmax(56px, 1fr) auto 18px",
    alignItems: "center",
    gap: 10,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: 13,
    letterSpacing: "0.08em",
    color: palette.inkSoft,
  };
}

function entryPathLineStyle(palette: TierPalette): React.CSSProperties {
  return {
    height: 1,
    transformOrigin: "left",
    background: `linear-gradient(90deg, transparent, ${palette.goldBright}, ${palette.accent})`,
    boxShadow: `0 0 18px ${palette.accent}66`,
    animation: "revealPathOpen 1.45s cubic-bezier(0.22, 1, 0.36, 1) infinite",
  };
}

function entryPulseStyle(palette: TierPalette): React.CSSProperties {
  return {
    color: palette.goldBright,
    textShadow: `0 0 16px ${palette.goldBright}`,
    animation: "revealPulseSoft 1.2s cubic-bezier(0.22, 1, 0.36, 1) infinite",
  };
}

function visionBadgeStyle(palette: TierPalette): React.CSSProperties {
  return {
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
  };
}

function portraitFrameStyle(palette: TierPalette, hasImage: boolean): React.CSSProperties {
  return {
    position: "relative",
    justifySelf: "end",
    width: "clamp(260px, 27vw, 380px)",
    aspectRatio: "2 / 3",
    overflow: "hidden",
    pointerEvents: "none",
    opacity: hasImage ? 1 : 0.34,
    border: `1px solid ${palette.goldBright}2e`,
    boxShadow: `0 0 70px ${palette.accent}22, inset 0 0 40px ${palette.accentDeep}2f`,
    background: `${palette.accentDeep}24`,
  };
}
