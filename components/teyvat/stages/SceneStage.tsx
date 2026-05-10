"use client";
import { useEffect } from "react";
import { StageWrapper } from "./StageWrapper";
import { BranchPager } from "@/components/teyvat/BranchPager";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { SiblingInfo } from "@/hooks/useAdventure";
import { useI18n } from "@/i18n";

interface Props {
  palette: TierPalette;
  sceneNumber: number;
  scenePageNumber?: number;
  scenePageCount?: number;
  prose: string;
  streamingText: string;
  streaming: boolean;
  closing: boolean;
  choices: string[];
  /** Already-taken choices from siblings — rendered with filled dot. */
  takenChoices: string[];
  visionLabel: string;
  pickedChoice: string | null;
  onPickChoice: (choice: string) => void;
  onStop: () => void;
  /** Sibling branch info for the BranchPager. */
  siblings: SiblingInfo;
  /** Called when the user wants to switch to a specific sibling node. */
  onSwitchSibling: (nodeId: string) => void;
  /** True when this stage is the currently visible one (gates arrow-key listener). */
  isActiveStage: boolean;
}

const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
  6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X",
};

function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

export function SceneStage({
  palette,
  sceneNumber,
  scenePageNumber = 1,
  scenePageCount = 1,
  prose,
  streamingText,
  streaming,
  closing,
  choices,
  takenChoices,
  visionLabel: _visionLabel,
  pickedChoice,
  onPickChoice,
  onStop,
  siblings,
  onSwitchSibling,
  isActiveStage,
}: Props) {
  const { t } = useI18n();

  // Arrow-key navigation between siblings (only when this stage is active).
  useEffect(() => {
    if (!isActiveStage) return;
    function handler(ev: KeyboardEvent) {
      if (siblings.branchCount < 2) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === "ArrowLeft" && siblings.activeIndex > 0) {
        onSwitchSibling(siblings.siblings[siblings.activeIndex - 1].id);
      } else if (ev.key === "ArrowRight" && siblings.activeIndex < siblings.branchCount - 1) {
        onSwitchSibling(siblings.siblings[siblings.activeIndex + 1].id);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [siblings, onSwitchSibling, isActiveStage]);

  const displayText = streaming ? streamingText : prose;
  const paragraphs = displayText.split(/\n\n+/).filter(Boolean);
  const isPaginatedScene = scenePageCount > 1;
  const sceneLabel = `${t("scene_label")} ${toRoman(sceneNumber)}${
    scenePageCount > 1 ? ` · ${scenePageNumber} of ${scenePageCount}` : ""
  }`;

  const scrollUpHint: React.CSSProperties = {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 18,
    color: palette.gold,
    opacity: 0.3,
    userSelect: "none",
  };

  const chevron: React.CSSProperties = {
    position: "absolute",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 22,
    color: palette.gold,
    opacity: 0.4,
    userSelect: "none",
  };

  const choiceBtn = (taken: boolean, disabled: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    padding: "13px 20px",
    background: "transparent",
    border: `1px solid ${palette.gold}55`,
    borderRadius: 2,
    fontFamily: "Georgia, serif",
    fontSize: 15,
    letterSpacing: "0.04em",
    color: disabled ? palette.inkSoft : taken ? palette.accent : palette.ink,
    cursor: disabled ? "default" : "pointer",
    textAlign: "left",
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <StageWrapper tier="reading" palette={palette} scrollable>
      {/* Reading-tier vision washes */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 90% 10%, ${palette.accent}0e 0%, transparent 50%),
                     radial-gradient(ellipse at 10% 90%, ${palette.accent}0a 0%, transparent 45%)`,
      }} />

      {/* Gold corner marks */}
      <div style={{ position: "absolute", top: 16, left: 16, width: 18, height: 18, borderTop: `1px solid ${palette.gold}`, borderLeft: `1px solid ${palette.gold}`, opacity: 0.4 }} />
      <div style={{ position: "absolute", top: 16, right: 16, width: 18, height: 18, borderTop: `1px solid ${palette.gold}`, borderRight: `1px solid ${palette.gold}`, opacity: 0.4 }} />
      <div style={{ position: "absolute", bottom: 16, left: 16, width: 18, height: 18, borderBottom: `1px solid ${palette.gold}`, borderLeft: `1px solid ${palette.gold}`, opacity: 0.4 }} />
      <div style={{ position: "absolute", bottom: 16, right: 16, width: 18, height: 18, borderBottom: `1px solid ${palette.gold}`, borderRight: `1px solid ${palette.gold}`, opacity: 0.4 }} />

      <div style={scrollUpHint} aria-hidden>↑</div>

      {/* Branch pager — shown above eyebrow when siblings exist */}
      {siblings.branchCount >= 2 && (
        <BranchPager
          palette={palette}
          siblings={siblings}
          onSwitchSibling={onSwitchSibling}
        />
      )}

      <div data-testid="scene-content" style={sceneContentStyle(isPaginatedScene)}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: palette.gold,
          margin: 0,
          textAlign: "center",
        }}>
          {sceneLabel}
        </p>

        {/* Prose */}
        <div style={{ textAlign: "left" }}>
          {paragraphs.map((para, i) => (
            <p key={i} style={{
              fontFamily: "Georgia, serif",
              fontSize: 17,
              lineHeight: 1.78,
              color: palette.ink,
              margin: "0 0 16px",
            }}>
              {/* First paragraph dropcap */}
              {i === 0 && para.length > 0 ? (
                <>
                  <span style={{
                    float: "left",
                    fontSize: 56,
                    lineHeight: 0.85,
                    fontFamily: "Georgia, serif",
                    fontWeight: 400,
                    color: palette.accent,
                    marginRight: 4,
                    marginTop: 4,
                  }}>
                    {para[0]}
                  </span>
                  {para.slice(1)}
                </>
              ) : para}
            </p>
          ))}

          {/* Streaming cursor */}
          {streaming && (
            <>
              <style>{`@keyframes blink { 0%, 100% { opacity: 0.9 } 50% { opacity: 0 } }`}</style>
              <span style={{
                color: palette.accent,
                fontFamily: "monospace",
                fontSize: 17,
                lineHeight: 1,
                verticalAlign: "text-bottom",
                animation: "blink 1s step-end infinite",
              }}>▋</span>
            </>
          )}
        </div>

        {/* Choices (after prose, not streaming, not closing) */}
        {!streaming && !closing && choices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {choices.map((choice, i) => {
              const taken = takenChoices.includes(choice);
              const disabled = pickedChoice !== null && pickedChoice !== choice;
              return (
                <button
                  key={i}
                  style={choiceBtn(taken, disabled)}
                  onClick={() => !disabled && onPickChoice(choice)}
                  disabled={disabled}
                >
                  {taken ? <span style={{ color: palette.accent, marginRight: 6 }}>●</span> : null}
                  {choice}
                </button>
              );
            })}

            <button
              style={{
                background: "transparent",
                border: "none",
                color: palette.inkSoft,
                fontFamily: "Georgia, serif",
                fontSize: 12,
                letterSpacing: "0.08em",
                cursor: "pointer",
                textDecoration: "underline",
                textDecorationColor: `${palette.gold}66`,
                marginTop: 8,
                padding: 0,
                alignSelf: "center",
              }}
              onClick={onStop}
            >
              {t("stop_here")}
            </button>
          </div>
        )}
      </div>

      <div style={chevron} aria-hidden>↓</div>
    </StageWrapper>
  );
}

function sceneContentStyle(isPaginatedScene: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 700,
    minHeight: isPaginatedScene ? "calc(100vh - 230px)" : undefined,
    display: "flex",
    flexDirection: "column",
    justifyContent: isPaginatedScene ? "center" : undefined,
    gap: 16,
    paddingTop: isPaginatedScene ? 0 : 20,
    paddingBottom: isPaginatedScene ? 24 : 0,
  };
}
