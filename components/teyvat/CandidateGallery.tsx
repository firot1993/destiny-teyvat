"use client";

import { useI18n } from "@/i18n";
import {
  BORDER_FAINT,
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  themeForVision,
} from "@/lib/teyvat/theme";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";

export interface CandidateOption {
  character: CanonCharacter;
  hook: string;
  imageUrl: string | null;
}

interface Props {
  candidates: CandidateOption[];
  onPick: (id: string) => void;
}

export function CandidateGallery({ candidates, onPick }: Props) {
  const { t, lang } = useI18n();

  return (
    <div style={wrap}>
      <div style={header}>
        <p style={eyebrow}>{t("choose_your_destiny")}</p>
        <p style={hint}>{t("candidate_pick_hint")}</p>
      </div>
      <div style={grid}>
        {candidates.map((candidate) => {
          const c = candidate.character;
          const theme = themeForVision(c.vision);
          const name = lang === "zh" ? c.nameZh : c.nameEn;
          return (
            <button
              key={c.id}
              type="button"
              style={{ ...card, borderColor: theme.border, background: theme.tint }}
              onClick={() => onPick(c.id)}
            >
              <div style={cardTop}>
                <span style={{ ...visionBadge, color: theme.emphasis }}>{c.vision}</span>
                <span style={meta}>{c.nation} · {c.weapon}</span>
              </div>
              {candidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.imageUrl} alt={c.nameEn} style={portrait} />
              ) : (
                <div style={portraitPlaceholder} />
              )}
              <p style={cardName}>{name}</p>
              <p style={hookText}>{candidate.hook}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minHeight: "100vh",
};

const header: React.CSSProperties = {
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: "clamp(2rem, 4.6vw, 3rem)",
  color: INK,
  margin: 0,
};

const hint: React.CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 520,
  color: INK_SOFT,
  lineHeight: 1.65,
};

const grid: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const card: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "16px 18px",
  textAlign: "left",
  border: `1px solid ${BORDER_SOFT}`,
  cursor: "pointer",
};

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const visionBadge: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: 600,
};

const meta: React.CSSProperties = {
  fontSize: 11,
  color: INK_FAINT,
  letterSpacing: "0.06em",
};

const portrait: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  border: `1px solid ${BORDER_FAINT}`,
};

const portraitPlaceholder: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  background: "rgba(31,27,21,0.04)",
  border: `1px dashed ${BORDER_FAINT}`,
};

const cardName: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 22,
  fontWeight: 500,
  color: INK,
  margin: 0,
};

const hookText: React.CSSProperties = {
  fontSize: 14,
  color: INK_SOFT,
  lineHeight: 1.65,
  margin: 0,
};
