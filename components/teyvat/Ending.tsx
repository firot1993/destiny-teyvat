"use client";

import { useState } from "react";
import { AdventureLog } from "@/components/teyvat/AdventureLog";
import { useI18n } from "@/i18n";
import type { AdventureState } from "@/lib/teyvat/scenes";
import {
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  PARCHMENT,
  themeForVision,
} from "@/lib/teyvat/theme";

interface Props {
  state: AdventureState;
  onNewRun: () => void;
}

export function Ending({ state, onNewRun }: Props) {
  const { t } = useI18n();
  const [showLog, setShowLog] = useState(false);
  const theme = themeForVision(state.character.vision);

  return (
    <div style={wrap}>
      <div style={{ ...panel, borderColor: theme.border, background: theme.tint }}>
        <p style={{ ...eyebrow, color: theme.emphasis }}>{state.character.vision}</p>
        <h1 style={nameStyle}>{state.character.name}</h1>
        <p style={meta}>
          {state.character.nation} · {state.character.weapon}
        </p>
        <p style={endingLine}>
          {state.endedBy === "user" ? t("their_story_pauses") : t("their_story_ends")}
        </p>
        <div style={btnRow}>
          <button type="button" style={primaryBtn} onClick={() => setShowLog(true)}>
            {t("read_again_from_start")}
          </button>
          <button type="button" style={secondaryBtn} onClick={onNewRun}>
            {t("walk_different_path")}
          </button>
        </div>
      </div>
      {showLog ? <AdventureLog scenes={state.scenes} onClose={() => setShowLog(false)} /> : null}
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  padding: "40px 28px",
  border: `1px solid ${BORDER_SOFT}`,
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
};

const nameStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: "clamp(3rem, 7vw, 4.2rem)",
};

const meta: React.CSSProperties = {
  marginTop: 8,
  color: INK_FAINT,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 12,
};

const endingLine: React.CSSProperties = {
  marginTop: 20,
  fontFamily: FONT_DISPLAY,
  fontSize: 28,
  color: INK,
};

const btnRow: React.CSSProperties = {
  marginTop: 28,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "center",
};

const primaryBtn: React.CSSProperties = {
  padding: "14px 24px",
  border: "none",
  background: INK,
  color: PARCHMENT,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};

const secondaryBtn: React.CSSProperties = {
  padding: "13px 24px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "transparent",
  color: INK,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};