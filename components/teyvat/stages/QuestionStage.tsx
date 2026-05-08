"use client";
import { StageWrapper } from "./StageWrapper";
import type { TierPalette } from "@/lib/teyvat/stageTiers";
import type { TeyvatStep } from "@/lib/teyvat/questionnaire";
import type { Language } from "@/types";

interface Props {
  palette: TierPalette;
  step: TeyvatStep;
  stepNumber: number;
  totalSteps: number;
  selectedValue: string | undefined;
  language: Language;
  sealed: boolean;
  onPick: (value: string) => void;
  visionLabel: string;
}

export function QuestionStage({
  palette,
  step,
  stepNumber,
  totalSteps,
  selectedValue,
  language,
  sealed,
  onPick,
  visionLabel: _visionLabel,
}: Props) {
  const question = step.title[language] ?? step.title.en;

  const eyebrow = `${stepNumber} of ${totalSteps}`;

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

  const optionBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "13px 20px",
    background: "transparent",
    border: `1px solid ${palette.gold}55`,
    borderRadius: 2,
    fontFamily: "Georgia, serif",
    fontSize: 15,
    letterSpacing: "0.04em",
    color: palette.ink,
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 200ms, color 200ms",
  };

  const optionSelected: React.CSSProperties = {
    ...optionBase,
    color: palette.accent,
    fontStyle: "italic",
    borderColor: palette.accent,
    borderBottomWidth: 2,
    borderBottomColor: palette.accent,
  };

  return (
    <StageWrapper tier="reading" palette={palette} sealed={sealed}>
      {/* Reading-tier vision wash */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse at 90% 10%, ${palette.accent}0f 0%, transparent 50%),
                     radial-gradient(ellipse at 10% 90%, ${palette.accent}0a 0%, transparent 45%)`,
      }} />

      {/* Gold corner marks */}
      <div style={{ position: "absolute", top: 16, left: 16, width: 18, height: 18, borderTop: `1px solid ${palette.gold}`, borderLeft: `1px solid ${palette.gold}`, opacity: 0.5 }} />
      <div style={{ position: "absolute", top: 16, right: 16, width: 18, height: 18, borderTop: `1px solid ${palette.gold}`, borderRight: `1px solid ${palette.gold}`, opacity: 0.5 }} />
      <div style={{ position: "absolute", bottom: 16, left: 16, width: 18, height: 18, borderBottom: `1px solid ${palette.gold}`, borderLeft: `1px solid ${palette.gold}`, opacity: 0.5 }} />
      <div style={{ position: "absolute", bottom: 16, right: 16, width: 18, height: 18, borderBottom: `1px solid ${palette.gold}`, borderRight: `1px solid ${palette.gold}`, opacity: 0.5 }} />

      <div style={scrollUpHint} aria-hidden>↑</div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", maxWidth: 560 }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: palette.gold,
          margin: 0,
        }}>
          {eyebrow}
        </p>

        {/* Question */}
        <h3 style={{
          fontFamily: "Georgia, serif",
          fontSize: 36,
          fontWeight: 300,
          color: palette.ink,
          margin: 0,
          lineHeight: 1.3,
        }}>
          {question}
        </h3>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 8 }}>
          {step.options.map((opt) => {
            const label = opt.label[language] ?? opt.label.en;
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.id}
                style={isSelected ? optionSelected : optionBase}
                onClick={() => onPick(opt.value)}
                disabled={sealed}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={chevron} aria-hidden>↓</div>
    </StageWrapper>
  );
}
