"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { AdventureState } from "@/lib/teyvat/scenes";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import {
  BORDER_SOFT,
  BORDER_FAINT,
  FONT_DISPLAY,
  INK,
  INK_SOFT,
  INK_FAINT,
  PARCHMENT,
  themeForVision,
} from "@/lib/teyvat/theme";

type Tab = "stories" | "characters";

interface Props {
  library: AdventureState[];
  onResume: (id: string) => void;
  onClose: () => void;
}

function uniqueCharacters(library: AdventureState[]): { character: RevealedCharacter; adventureCount: number; from: AdventureState }[] {
  const seen = new Map<string, { character: RevealedCharacter; count: number; from: AdventureState }>();
  for (const entry of library) {
    const key = entry.character.name;
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(key, { character: entry.character, count: 1, from: entry });
    }
  }
  return [...seen.values()].map((v) => ({ character: v.character, adventureCount: v.count, from: v.from }));
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function Bookshelf({ library, onResume, onClose }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("stories");
  const characters = uniqueCharacters(library);

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={header}>
          <h2 style={titleStyle}>{t("bookshelf")}</h2>
          <button type="button" style={closeBtn} onClick={onClose}>
            {t("close")}
          </button>
        </div>

        <div style={tabRow}>
          <button
            type="button"
            style={tab === "stories" ? tabActive : tabInactive}
            onClick={() => setTab("stories")}
          >
            {t("stories_tab")} ({library.length})
          </button>
          <button
            type="button"
            style={tab === "characters" ? tabActive : tabInactive}
            onClick={() => setTab("characters")}
          >
            {t("characters_tab")} ({characters.length})
          </button>
        </div>

        <div style={scrollArea}>
          {tab === "stories" ? (
            library.length === 0 ? (
              <p style={emptyText}>{t("no_stories_yet")}</p>
            ) : (
              library.map((entry) => (
                <StoryCard key={entry.id} entry={entry} onResume={onResume} />
              ))
            )
          ) : characters.length === 0 ? (
            <p style={emptyText}>{t("no_characters_yet")}</p>
          ) : (
            characters.map(({ character, adventureCount, from }) => (
              <CharacterCard
                key={`${character.name}-${from.id}`}
                character={character}
                adventureCount={adventureCount}
                adventureId={from.id}
                onResume={onResume}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Story card ---------- */

function StoryCard({ entry, onResume }: { entry: AdventureState; onResume: (id: string) => void }) {
  const { t } = useI18n();
  const theme = themeForVision(entry.character.vision);
  const isUnfinished = !entry.ended;

  return (
    <button
      type="button"
      style={{ ...card, borderColor: theme.border, background: theme.tint }}
      onClick={() => onResume(entry.id)}
    >
      <div style={cardTop}>
        <span style={{ ...visionBadge, color: theme.emphasis }}>{entry.character.vision}</span>
        <span style={dateText}>{formatDate(entry.startedAt)}</span>
      </div>
      <p style={cardName}>{entry.character.name}</p>
      <p style={cardMeta}>
        {entry.character.nation} · {entry.character.weapon} · {entry.scenes.length} {t("scene_label").toLowerCase()}{entry.scenes.length !== 1 ? "s" : ""}
      </p>
      <div style={cardBottom}>
        {isUnfinished ? (
          <span style={unfinishedBadge}>{t("unfinished")}</span>
        ) : (
          <span style={finishedBadge}>
            {entry.endedBy === "user" ? t("paused") : t("completed")}
          </span>
        )}
        {isUnfinished ? (
          <span style={resumeHint}>{t("continue_story")} →</span>
        ) : (
          <span style={resumeHint}>{t("read_again")} →</span>
        )}
      </div>
    </button>
  );
}

/* ---------- Character card ---------- */

function CharacterCard({
  character,
  adventureCount,
  adventureId,
  onResume,
}: {
  character: RevealedCharacter;
  adventureCount: number;
  adventureId: string;
  onResume: (id: string) => void;
}) {
  const { t } = useI18n();
  const theme = themeForVision(character.vision);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ ...card, borderColor: theme.border, background: theme.tint }}>
      <div style={cardTop}>
        <span style={{ ...visionBadge, color: theme.emphasis }}>{character.vision}</span>
        <span style={dateText}>
          {adventureCount} {adventureCount === 1 ? t("adventure_singular") : t("adventure_plural")}
        </span>
      </div>
      <p style={cardName}>{character.name}</p>
      <p style={cardMeta}>
        {character.nation} · {character.weapon} · {character.archetype}
      </p>
      {character.constellation ? (
        <p style={constellationText}>✦ {character.constellation}</p>
      ) : null}
      {expanded ? (
        <>
          <p style={bioText}>{character.bio}</p>
          {character.visionStory ? (
            <p style={visionStoryText}>{character.visionStory}</p>
          ) : null}
        </>
      ) : null}
      <div style={cardBottom}>
        <button
          type="button"
          style={textBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("show_less") : t("show_more")}
        </button>
        <button
          type="button"
          style={textBtn}
          onClick={() => onResume(adventureId)}
        >
          {t("view_adventure")} →
        </button>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(31,27,21,0.4)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  background: PARCHMENT,
  border: `1px solid ${BORDER_SOFT}`,
  boxShadow: "0 20px 60px rgba(31,27,21,0.15)",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px 0",
};

const titleStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
  fontWeight: 500,
  color: INK,
  margin: 0,
};

const closeBtn: React.CSSProperties = {
  border: `1px solid ${BORDER_SOFT}`,
  background: "transparent",
  color: INK_SOFT,
  padding: "6px 14px",
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const tabRow: React.CSSProperties = {
  display: "flex",
  gap: 0,
  padding: "16px 24px 0",
  borderBottom: `1px solid ${BORDER_FAINT}`,
};

const tabBase: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  border: "none",
  background: "transparent",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const tabActive: React.CSSProperties = {
  ...tabBase,
  color: INK,
  borderBottom: `2px solid ${INK}`,
  fontWeight: 600,
};

const tabInactive: React.CSSProperties = {
  ...tabBase,
  color: INK_FAINT,
  borderBottom: "2px solid transparent",
};

const scrollArea: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 24px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const emptyText: React.CSSProperties = {
  textAlign: "center",
  color: INK_FAINT,
  fontSize: 15,
  fontFamily: FONT_DISPLAY,
  padding: "40px 0",
};

const card: React.CSSProperties = {
  width: "100%",
  padding: "16px 20px",
  border: `1px solid ${BORDER_SOFT}`,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 4,
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

const dateText: React.CSSProperties = {
  fontSize: 11,
  color: INK_FAINT,
};

const cardName: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 22,
  fontWeight: 500,
  color: INK,
  margin: "4px 0 0",
};

const cardMeta: React.CSSProperties = {
  fontSize: 12,
  color: INK_SOFT,
  letterSpacing: "0.06em",
  margin: 0,
};

const cardBottom: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
};

const unfinishedBadge: React.CSSProperties = {
  fontSize: 11,
  color: "#b46e00",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const finishedBadge: React.CSSProperties = {
  fontSize: 11,
  color: INK_FAINT,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const resumeHint: React.CSSProperties = {
  fontSize: 12,
  color: INK_SOFT,
  letterSpacing: "0.04em",
};

const constellationText: React.CSSProperties = {
  fontSize: 13,
  color: INK_SOFT,
  margin: "2px 0 0",
  fontStyle: "italic",
};

const bioText: React.CSSProperties = {
  fontSize: 14,
  color: INK,
  lineHeight: 1.6,
  margin: "8px 0 0",
};

const visionStoryText: React.CSSProperties = {
  fontSize: 13,
  color: INK_SOFT,
  lineHeight: 1.6,
  margin: "6px 0 0",
  fontStyle: "italic",
};

const textBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: INK_SOFT,
  fontSize: 12,
  letterSpacing: "0.04em",
  padding: 0,
  cursor: "pointer",
};
