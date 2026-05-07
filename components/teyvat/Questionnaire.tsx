"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import type { QuestionnaireSchema, TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import {
  BORDER_FAINT,
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  PARCHMENT,
} from "@/lib/teyvat/theme";

interface Props {
  schema: QuestionnaireSchema;
  onComplete: (answers: TeyvatAnswers) => void;
}

type ScreenState =
  | { kind: "intro"; stepIndex: number }
  | { kind: "question"; stepIndex: number };

function nextScreen(schema: QuestionnaireSchema, stepIndex: number): ScreenState | null {
  if (stepIndex >= schema.steps.length - 1) {
    return null;
  }

  const nextIndex = stepIndex + 1;
  const nextStep = schema.steps[nextIndex];
  const currentStep = schema.steps[stepIndex];
  if (nextStep.chapter !== currentStep.chapter) {
    return { kind: "intro", stepIndex: nextIndex };
  }
  return { kind: "question", stepIndex: nextIndex };
}

export function Questionnaire({ schema, onComplete }: Props) {
  const { t, lang } = useI18n();
  const [answers, setAnswers] = useState<TeyvatAnswers>({});
  const [screen, setScreen] = useState<ScreenState>({ kind: "intro", stepIndex: 0 });

  const step = schema.steps[screen.stepIndex];
  const chapter = schema.chapterMeta[step.chapter];
  const selected = answers[step.id] ?? "";
  const progressCount = useMemo(
    () => schema.steps.findIndex((item) => item.id === step.id) + 1,
    [schema, step.id]
  );

  if (screen.kind === "intro") {
    return (
      <div style={wrap}>
        <div style={chapterCard}>
          <p style={chapterEyebrow}>{chapter.title[lang]}</p>
          <h2 style={chapterTitle}>{chapter.title[lang]}</h2>
          <p style={chapterSub}>{chapter.subtitle[lang]}</p>
          <button
            type="button"
            style={nextBtn}
            onClick={() => setScreen({ kind: "question", stepIndex: screen.stepIndex })}
          >
            {t("begin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={progress}>
        {schema.steps.map((item, index) => (
          <span
            key={item.id}
            style={{
              ...dot,
              opacity: index < progressCount ? 1 : 0.22,
              transform: index + 1 === progressCount ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>

      <div style={chapterBlock}>
        <p style={chapterEyebrow}>{chapter.title[lang]}</p>
        <h2 style={questionStyle}>{step.title[lang]}</h2>
      </div>

      <div style={optionsWrap}>
        {step.options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.id}
              type="button"
              style={{
                ...optionBtn,
                ...(active
                  ? {
                      border: `1px solid ${INK}`,
                      background: "rgba(31,27,21,0.06)",
                    }
                  : undefined),
              }}
              onClick={() =>
                setAnswers((current) => ({
                  ...current,
                  [step.id]: option.value,
                }))
              }
            >
              {option.label[lang]}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        style={{
          ...nextBtn,
          opacity: selected ? 1 : 0.45,
        }}
        disabled={!selected}
        onClick={() => {
          const next = nextScreen(schema, screen.stepIndex);
          if (!next) {
            onComplete(answers);
            return;
          }
          setScreen(next);
        }}
      >
        {screen.stepIndex === schema.steps.length - 1 ? t("begin") : t("next")}
      </button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "32px 24px",
  gap: 24,
};

const progress: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
};

const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: INK,
  transition: "all 180ms ease",
};

const chapterCard: React.CSSProperties = {
  padding: "40px 28px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "rgba(245,236,217,0.88)",
  textAlign: "center",
};

const chapterBlock: React.CSSProperties = {
  textAlign: "center",
};

const chapterEyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: INK_FAINT,
};

const chapterTitle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
  fontWeight: 500,
  marginTop: 10,
  color: INK,
};

const chapterSub: React.CSSProperties = {
  margin: "14px auto 0",
  maxWidth: 420,
  color: INK_SOFT,
  lineHeight: 1.7,
};

const questionStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: "clamp(2rem, 4.2vw, 3rem)",
  lineHeight: 1.12,
  color: INK,
  margin: "12px auto 0",
  maxWidth: 620,
};

const optionsWrap: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const optionBtn: React.CSSProperties = {
  padding: "18px 18px",
  border: `1px solid ${BORDER_FAINT}`,
  background: "rgba(255,255,255,0.36)",
  color: INK_SOFT,
  textAlign: "left",
  lineHeight: 1.55,
  fontSize: 15,
};

const nextBtn: React.CSSProperties = {
  alignSelf: "center",
  padding: "13px 24px",
  border: "none",
  background: INK,
  color: PARCHMENT,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};