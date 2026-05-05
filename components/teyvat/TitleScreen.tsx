"use client";

import { useI18n } from "@/i18n";
import { FONT_DISPLAY, INK, INK_SOFT, PARCHMENT, BORDER_SOFT } from "@/lib/teyvat/theme";

interface Props {
  onBegin: () => void;
  onResume?: () => void;
  onOpenBookshelf?: () => void;
  hasSavedAdventure?: boolean;
  hasLibrary?: boolean;
}

export function TitleScreen({ onBegin, onResume, onOpenBookshelf, hasSavedAdventure, hasLibrary }: Props) {
  const { t } = useI18n();

  return (
    <div style={wrap}>
      <div style={panel}>
        <div style={glyph}>✦</div>
        <p style={eyebrow}>Teyvat Adventure</p>
        <h1 style={titleStyle}>{t("app_title")}</h1>
        <p style={taglineStyle}>{t("app_tagline")}</p>
        <button type="button" style={primaryBtn} onClick={onBegin}>
          {t("begin")}
        </button>
        {hasSavedAdventure && onResume ? (
          <button type="button" style={secondaryBtn} onClick={onResume}>
            {t("resume")}
          </button>
        ) : null}
        {hasLibrary && onOpenBookshelf ? (
          <button type="button" style={secondaryBtn} onClick={onOpenBookshelf}>
            {t("open_bookshelf")}
          </button>
        ) : null}
      </div>
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
  maxWidth: 640,
  padding: "48px 32px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "rgba(245,236,217,0.86)",
  boxShadow: "0 20px 60px rgba(31,27,21,0.08)",
  textAlign: "center",
  backdropFilter: "blur(10px)",
};

const glyph: React.CSSProperties = {
  fontSize: 28,
  color: INK_SOFT,
  marginBottom: 12,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  color: INK_SOFT,
};

const titleStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: "clamp(3rem, 7vw, 5rem)",
  fontWeight: 500,
  lineHeight: 0.95,
  marginTop: 10,
};

const taglineStyle: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.6,
  color: INK_SOFT,
  maxWidth: 420,
  margin: "18px auto 0",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 28,
  padding: "14px 26px",
  border: "none",
  background: INK,
  color: PARCHMENT,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const secondaryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 26px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "transparent",
  color: INK_SOFT,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};