"use client";
import { useEffect, useRef, useState } from "react";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { ParsedDirection } from "@/lib/teyvat/candidates";
import type { Language } from "@/types";
import { useI18n } from "@/i18n";

type RevealPronoun = "he" | "she" | "they";

const REVEAL_ENTRANCE_MS = 440;
const REVEAL_ENTRANCE_TOTAL_MS = 600;
const REVEAL_ENTRANCE_BUFFER_MS = 20;
const REVEAL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const REVEAL_NAME_DELAY_MS = 140;
const REVEAL_TITLE_DELAY_MS = 200;
const REVEAL_META_CHIP_STAGGER_MS = 80;

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
  const { t } = useI18n();
  const isWish = directions !== null;
  const isRevealReady = Boolean((character ?? fatedCharacter) && !loading);
  const wasRevealReadyRef = useRef(isRevealReady);
  const [isRevealCascadePlaying, setIsRevealCascadePlaying] = useState(false);
  const makeRevealAnimation = (keyframe: string, delayMs = 0) =>
    isRevealCascadePlaying
      ? `${keyframe} ${Math.max(REVEAL_ENTRANCE_MS, REVEAL_ENTRANCE_TOTAL_MS - delayMs)}ms ${REVEAL_EASING} ${delayMs}ms both`
      : undefined;

  const revealMetaSources = {
    nation: character?.nation ?? fatedCharacter?.nation,
    vision: character?.vision ?? fatedCharacter?.vision,
    weapon: character?.weapon ?? fatedCharacter?.weapon,
  };
  const revealMetaChips = [
    revealMetaSources.nation,
    revealMetaSources.vision,
    revealMetaSources.weapon,
  ].reduce<string[]>((chips, chip) => {
    if (chip) {
      chips.push(chip);
    }
    return chips;
  }, []);
  const enteringWorldLabel = t("reveal_opening_path");
  const commitMessage = t("reveal_commit_prompt");
  const commitCta = t("reveal_commit_cta");
  const walkIntoWorldText = t("reveal_walk_into_world", {
    possessive: t(`reveal_world_possessive_${resolveRevealPronoun({ character, fatedCharacter, language })}`),
  });

  useEffect(() => {
    if (!isRevealReady) {
      wasRevealReadyRef.current = false;
      setIsRevealCascadePlaying(false);
      return;
    }

    if (wasRevealReadyRef.current) {
      return;
    }

    wasRevealReadyRef.current = true;
    setIsRevealCascadePlaying(true);
    const timer = window.setTimeout(() => {
      setIsRevealCascadePlaying(false);
    }, REVEAL_ENTRANCE_TOTAL_MS + REVEAL_ENTRANCE_BUFFER_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isRevealReady]);

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

        @keyframes revealPortraitEntrance {
          0% {
            transform: scale(0.92) translateY(16px);
            opacity: 0.34;
            filter: grayscale(1) saturate(0.42) brightness(0.56);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
            filter: none;
          }
        }

        @keyframes revealNameEntrance {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes revealMetaChipEntrance {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-reveal-animation="true"] * {
            animation: none !important;
            transition: none !important;
          }

          [data-reveal-entry-feedback] * {
            animation: none !important;
            transition: none !important;
          }

          [data-reveal-animation="true"] [data-reveal-portrait],
          [data-reveal-animation="true"] [data-reveal-name],
          [data-reveal-animation="true"] [data-reveal-title],
          [data-reveal-animation="true"] [data-reveal-meta-chip] {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
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
            {t("reveal_loading_copy")}
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
            {commitMessage}
          </p>
          <button style={primaryBtn} onClick={onCommit}>
            {commitCta}
          </button>
        </div>
      ) : (
          <div
            data-testid="reveal-layout"
            data-reveal-layout
            data-reveal-animation={isRevealCascadePlaying ? "true" : undefined}
            style={revealLayoutStyle}
          >
          {/* Silhouette / portrait area */}
          <div
            data-testid="reveal-portrait"
            data-reveal-portrait
            style={{
              ...portraitFrameStyle(palette, Boolean(imageUrl)),
              animation: makeRevealAnimation("revealPortraitEntrance", 0),
            }}
          >
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
            <h2
              data-reveal-name
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(44px, 5vw, 72px)",
                fontWeight: 300,
                letterSpacing: "0.04em",
                color: palette.ink,
                margin: 0,
                lineHeight: 1,
                textWrap: "balance",
                animation: makeRevealAnimation("revealNameEntrance", REVEAL_NAME_DELAY_MS),
                willChange: "opacity, transform",
              }}>
                {displayName}
              </h2>

            {displayTitle && (
              <p
                data-reveal-title
                style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 16,
                letterSpacing: "0.08em",
                color: palette.goldBright,
                margin: 0,
                animation: makeRevealAnimation("revealNameEntrance", REVEAL_TITLE_DELAY_MS),
                willChange: "opacity, transform",
              }}>
                {language === "zh" ? `「${displayTitle}」` : `— ${displayTitle} —`}
              </p>
            )}

            {/* Nation row */}
            {revealMetaSources.nation && (
              <div data-reveal-meta style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {revealMetaChips.map((chip, metaIndex) => (
                  <span
                    key={chip}
                    data-reveal-meta-chip
                    style={{
                      padding: "3px 10px",
                      border: `1px solid ${palette.gold}60`,
                      borderRadius: 20,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: palette.inkSoft,
                      animation: makeRevealAnimation("revealMetaChipEntrance", metaIndex * REVEAL_META_CHIP_STAGGER_MS),
                      willChange: "opacity, transform",
                    }}
                  >
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
                  {enteringWorld ? enteringWorldLabel : walkIntoWorldText}
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

function resolveRevealPronoun({
  character,
  fatedCharacter,
  language,
}: {
  character: RevealedCharacter | null;
  fatedCharacter: CanonCharacter | null;
  language: Language;
}): RevealPronoun {
  const fatedBio =
    language === "zh"
    ? fatedCharacter?.bioBlurb.zh ?? fatedCharacter?.bioBlurb.en
    : fatedCharacter?.bioBlurb.en ?? fatedCharacter?.bioBlurb.zh;
  const bios = [character?.bio, fatedBio];
  for (const bio of bios) {
    const pronoun = inferPronounFromText(bio, language);
    if (pronoun) {
      return pronoun;
    }
  }

  return "they";
}

function inferPronounFromText(text: string | undefined, language: Language): RevealPronoun | null {
  if (!text) {
    return null;
  }

  if (language === "zh") {
    if (/她/.test(text)) {
      return "she";
    }
    if (/他们|她们/.test(text)) {
      return "they";
    }
    if (/他/.test(text)) {
      return "he";
    }
    return null;
  }

  const normalized = text.toLowerCase();
  if (/\b(she|her|hers|herself)\b/.test(normalized)) {
    return "she";
  }
  if (/\b(they|them|their|theirs)\b/.test(normalized)) {
    return "they";
  }
  if (/\b(he|him|his|himself)\b/.test(normalized)) {
    return "he";
  }
  return null;
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
