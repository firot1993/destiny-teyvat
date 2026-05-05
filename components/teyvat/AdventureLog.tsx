"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { Scene } from "@/lib/teyvat/scenes";
import {
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  PARCHMENT,
} from "@/lib/teyvat/theme";

interface Props {
  scenes: Scene[];
  onClose: () => void;
}

export function AdventureLog({ scenes, onClose }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<number | null>(scenes[scenes.length - 1]?.sceneNumber ?? null);

  return (
    <aside style={panel}>
      <button type="button" style={closeBtn} onClick={onClose}>
        {t("close")}
      </button>
      <h2 style={header}>{t("adventure_log")}</h2>
      <ul style={list}>
        {scenes.map((scene) => {
          const open = expanded === scene.sceneNumber;
          return (
            <li key={scene.sceneNumber} style={item}>
              <button
                type="button"
                style={itemBtn}
                onClick={() => setExpanded(open ? null : scene.sceneNumber)}
              >
                <span style={itemHead}>
                  {t("scene_label")} {scene.sceneNumber}
                </span>
                <span style={summaryStyle}>{scene.summary}</span>
                {scene.fromChoice ? <span style={fromChoice}>{scene.fromChoice}</span> : null}
              </button>
              {open ? <p style={fullText}>{scene.text}</p> : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

const panel: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(440px, 100vw)",
  height: "100vh",
  overflowY: "auto",
  background: PARCHMENT,
  borderLeft: `1px solid ${BORDER_SOFT}`,
  padding: "56px 20px 20px",
  zIndex: 30,
  boxShadow: "-10px 0 40px rgba(31,27,21,0.08)",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 18,
  border: "none",
  background: "none",
  color: INK_FAINT,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};

const header: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: 32,
  marginBottom: 18,
};

const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const item: React.CSSProperties = {
  borderBottom: `1px solid ${BORDER_SOFT}`,
  paddingBottom: 14,
};

const itemBtn: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "none",
  textAlign: "left",
  padding: 0,
  display: "grid",
  gap: 5,
};

const itemHead: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: 22,
};

const summaryStyle: React.CSSProperties = {
  color: INK_SOFT,
  lineHeight: 1.55,
};

const fromChoice: React.CSSProperties = {
  color: INK_FAINT,
  fontSize: 12,
  fontStyle: "italic",
};

const fullText: React.CSSProperties = {
  marginTop: 12,
  color: INK_SOFT,
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
};