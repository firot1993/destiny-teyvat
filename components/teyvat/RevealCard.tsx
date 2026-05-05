"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import {
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  PARCHMENT,
  themeForVision,
} from "@/lib/teyvat/theme";

interface Props {
  character: RevealedCharacter;
  onAdvance: () => void;
}

export function RevealCard({ character, onAdvance }: Props) {
  const { t } = useI18n();
  const [beat, setBeat] = useState(0);
  const theme = themeForVision(character.vision);

  useEffect(() => {
    setBeat(0);
    const timers = Array.from({ length: 6 }, (_, index) =>
      window.setTimeout(() => setBeat(index + 1), 120 * (index + 1))
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [character]);

  return (
    <div style={wrap}>
      <article
        style={{
          ...card,
          background: `linear-gradient(180deg, ${theme.tint}, rgba(245,236,217,0.96))`,
          border: `1px solid ${theme.border}`,
        }}
      >
        {beat >= 1 ? (
          <>
            <p style={{ ...eyebrow, color: theme.emphasis }}>{character.vision}</p>
            <h1 style={nameStyle}>{character.name}</h1>
          </>
        ) : null}

        {beat >= 2 ? (
          <>
            <p style={metaLine}>
              {character.nation} · {character.weapon} · {character.archetype}
            </p>
          </>
        ) : null}

        {beat >= 3 ? <p style={bioStyle}>{character.bio}</p> : null}

        {beat >= 4 ? (
          <>
            <div style={divider} />
            <h2 style={visionHeader}>{t("day_vision_answered")}</h2>
            <p style={visionStory}>{character.visionStory}</p>
          </>
        ) : null}

        {beat >= 5 ? (
          <>
            <div style={divider} />
            <p style={constellationStyle}>{character.constellation}</p>
            <p style={signatureStyle}>{character.signature}</p>
          </>
        ) : null}

        {beat >= 6 && character.knownAssociate ? (
          <p style={associateStyle}>
            {t("travel_with")} {character.knownAssociate}
          </p>
        ) : null}

        <button type="button" style={advanceBtn} disabled={beat < 6} onClick={onAdvance}>
          {t("walk_into_world")}
        </button>
      </article>
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

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  padding: "36px 28px",
  boxShadow: "0 24px 72px rgba(31,27,21,0.08)",
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
};

const nameStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: "clamp(3rem, 7vw, 4.6rem)",
  marginTop: 8,
  lineHeight: 0.96,
};

const metaLine: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: INK_FAINT,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const bioStyle: React.CSSProperties = {
  marginTop: 20,
  color: INK_SOFT,
  lineHeight: 1.7,
  fontSize: 16,
};

const divider: React.CSSProperties = {
  width: "100%",
  height: 1,
  background: BORDER_SOFT,
  margin: "20px 0",
};

const visionHeader: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: 28,
};

const visionStory: React.CSSProperties = {
  marginTop: 12,
  fontSize: 15,
  lineHeight: 1.8,
  color: INK_SOFT,
  fontStyle: "italic",
};

const constellationStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 24,
  color: INK,
};

const signatureStyle: React.CSSProperties = {
  marginTop: 6,
  color: INK_FAINT,
  fontSize: 14,
  fontStyle: "italic",
};

const associateStyle: React.CSSProperties = {
  marginTop: 16,
  color: INK_SOFT,
  fontSize: 14,
};

const advanceBtn: React.CSSProperties = {
  marginTop: 28,
  padding: "14px 24px",
  border: "none",
  background: INK,
  color: PARCHMENT,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};