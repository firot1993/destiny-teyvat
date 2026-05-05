"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { Scene } from "@/lib/teyvat/scenes";
import {
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
} from "@/lib/teyvat/theme";

interface Props {
  scene: Scene | null;
  streaming: boolean;
  streamingText: string;
  accent: string;
  onPickChoice: (choice: string) => void;
  onStop: () => void;
  onOpenLog?: () => void;
}

export function SceneView({
  scene,
  streaming,
  streamingText,
  accent,
  onPickChoice,
  onStop,
  onOpenLog,
}: Props) {
  const { t } = useI18n();
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);

  useEffect(() => {
    setPickedChoice(null);
  }, [scene?.sceneNumber]);

  const proseText = streaming ? streamingText : scene?.text ?? "";
  const paragraphs = proseText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div style={wrap}>
      <div style={topBar}>
        <span style={sceneLabel}>
          {t("scene_label")} {scene?.sceneNumber ?? "…"}
        </span>
        {onOpenLog ? (
          <button type="button" style={logToggle} onClick={onOpenLog}>
            ↺ {t("see_earlier_scenes")}
          </button>
        ) : null}
      </div>

      <div style={{ ...prose, borderTop: `1px solid ${accent}` }}>
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 18)}`} style={paraStyle}>
            {paragraph}
          </p>
        ))}
        {streaming ? <span style={cursorStyle}>▋</span> : null}
        {!streaming && scene?.closing ? <p style={closingMark}>∎</p> : null}
      </div>

      {!streaming && scene && !scene.closing ? (
        <div style={choicesWrap}>
          {scene.choices.map((choice) => {
            const isPicked = pickedChoice === choice;
            const hasSelection = Boolean(pickedChoice);
            return (
              <button
                key={choice}
                type="button"
                style={{
                  ...choiceBtn,
                  opacity: !hasSelection || isPicked ? 1 : 0.36,
                  borderColor: isPicked ? accent : BORDER_SOFT,
                }}
                disabled={hasSelection}
                onClick={() => {
                  setPickedChoice(choice);
                  onPickChoice(choice);
                }}
              >
                {choice}
              </button>
            );
          })}

          <button type="button" style={stopBtn} onClick={onStop}>
            {t("stop_here")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "32px 24px 56px",
  gap: 16,
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  fontSize: 12,
  color: INK_FAINT,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const sceneLabel: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
};

const logToggle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: INK_FAINT,
  fontSize: 12,
  padding: 0,
};

const prose: React.CSSProperties = {
  paddingTop: 18,
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: "clamp(1.45rem, 2.8vw, 2rem)",
  lineHeight: 1.45,
};

const paraStyle: React.CSSProperties = {
  margin: "0 0 1em 0",
};

const cursorStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 4,
  animation: "blink 1s step-end infinite",
};

const closingMark: React.CSSProperties = {
  marginTop: 24,
  color: INK_FAINT,
  fontSize: 20,
};

const choicesWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 12,
};

const choiceBtn: React.CSSProperties = {
  padding: "14px 18px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "rgba(255,255,255,0.28)",
  textAlign: "left",
  color: INK_SOFT,
  fontSize: 15,
};

const stopBtn: React.CSSProperties = {
  marginTop: 10,
  alignSelf: "flex-start",
  padding: "10px 0",
  border: "none",
  background: "none",
  color: INK_FAINT,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};