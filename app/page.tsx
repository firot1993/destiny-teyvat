"use client";

import { useState } from "react";
import { AdventureLog } from "@/components/teyvat/AdventureLog";
import { Bookshelf } from "@/components/teyvat/Bookshelf";
import { Ending } from "@/components/teyvat/Ending";
import { Questionnaire } from "@/components/teyvat/Questionnaire";
import { RevealCard } from "@/components/teyvat/RevealCard";
import { SceneView } from "@/components/teyvat/SceneView";
import { TitleScreen } from "@/components/teyvat/TitleScreen";
import { useAdventure } from "@/hooks/useAdventure";
import { useI18n } from "@/i18n";
import { DEFAULT_PROVIDER, PROVIDERS } from "@/lib/constants";
import {
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  PARCHMENT,
  themeForVision,
} from "@/lib/teyvat/theme";

export default function Page() {
  const { t, lang, toggleLang } = useI18n();
  const {
    phase,
    character,
    adventure,
    library,
    streamingText,
    error,
    dailyLimit,
    dailyRemaining,
    provider,
    model,
    hasSavedAdventure,
    begin,
    openBookshelf,
    closeBookshelf,
    loadFromLibrary,
    submitQuestionnaire,
    enterWorld,
    chooseChoice,
    stopHere,
    startOver,
    resumeAdventure,
    setProvider,
    setModel,
  } = useAdventure();
  const [logOpen, setLogOpen] = useState(false);

  const theme = character ? themeForVision(character.vision) : null;
  const scene = adventure?.scenes[adventure.scenes.length - 1] ?? null;
  const showSettings =
    phase === "idle" || phase === "bookshelf" || phase === "revealing" || phase === "reveal-shown";
  const showQuota = dailyRemaining !== null && dailyRemaining < 3;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme
          ? `radial-gradient(circle at top, ${theme.tint}, transparent 42%), linear-gradient(180deg, #f5ecd9 0%, #eadcc0 100%)`
          : undefined,
      }}
    >
      {showSettings ? (
        <div style={settingsWrap}>
          <button type="button" style={langButton} onClick={toggleLang}>
            {lang === "en" ? "中文" : "EN"}
          </button>
          <div style={settingsPanel}>
            <span style={settingsLabel}>{t("settings")}</span>
            <label style={settingsField}>
              <span>{t("provider_label")}</span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                {Object.keys(PROVIDERS).map((providerKey) => (
                  <option key={providerKey} value={providerKey}>
                    {providerKey}
                  </option>
                ))}
              </select>
            </label>
            <label style={settingsField}>
              <span>{t("model_label")}</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {(PROVIDERS[provider] ?? PROVIDERS[DEFAULT_PROVIDER]).map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {showQuota ? (
        <div style={quotaBadge}>
          {dailyRemaining} {t("quota_low")}
          {dailyLimit ? ` / ${dailyLimit}` : ""}
        </div>
      ) : null}

      {phase === "idle" ? (
        <TitleScreen
          onBegin={begin}
          onResume={resumeAdventure}
          onOpenBookshelf={openBookshelf}
          hasSavedAdventure={hasSavedAdventure}
          hasLibrary={library.length > 0}
        />
      ) : null}

      {phase === "bookshelf" ? (
        <Bookshelf
          library={library}
          onResume={loadFromLibrary}
          onClose={closeBookshelf}
        />
      ) : null}

      {phase === "questionnaire" ? (
        <Questionnaire onComplete={(answers) => void submitQuestionnaire(answers, lang)} />
      ) : null}

      {phase === "revealing" ? (
        <div style={loadingWrap}>
          <div style={loadingGlyph}>✦</div>
          <p style={loadingText}>{t("listening_for_name")}</p>
        </div>
      ) : null}

      {phase === "reveal-shown" && character ? (
        <RevealCard character={character} onAdvance={() => void enterWorld(lang)} />
      ) : null}

      {(phase === "scene-generating" || phase === "scene-shown") && adventure ? (
        <>
          <SceneView
            scene={scene}
            streaming={phase === "scene-generating"}
            streamingText={streamingText}
            accent={theme?.accent ?? INK}
            onPickChoice={(choice) => void chooseChoice(choice, lang)}
            onStop={stopHere}
            onOpenLog={() => setLogOpen(true)}
          />
          {logOpen ? (
            <AdventureLog
              scenes={adventure.scenes}
              onClose={() => setLogOpen(false)}
            />
          ) : null}
        </>
      ) : null}

      {phase === "ended" && adventure ? (
        <Ending state={adventure} onNewRun={startOver} />
      ) : null}

      {error ? <div style={errorToast}>{error}</div> : null}
    </main>
  );
}

const settingsWrap: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 20,
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const langButton: React.CSSProperties = {
  border: "1px solid rgba(31,27,21,0.12)",
  background: "rgba(255,255,255,0.42)",
  color: INK,
  padding: "8px 10px",
  fontSize: 12,
};

const settingsPanel: React.CSSProperties = {
  minWidth: 220,
  padding: 12,
  border: "1px solid rgba(31,27,21,0.12)",
  background: "rgba(245,236,217,0.92)",
  backdropFilter: "blur(10px)",
  display: "grid",
  gap: 10,
};

const settingsLabel: React.CSSProperties = {
  fontSize: 11,
  color: INK_FAINT,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
};

const settingsField: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: INK,
};

const quotaBadge: React.CSSProperties = {
  position: "fixed",
  left: 16,
  bottom: 16,
  zIndex: 20,
  padding: "10px 12px",
  background: "rgba(245,236,217,0.9)",
  color: INK_FAINT,
  fontSize: 12,
  letterSpacing: "0.08em",
};

const loadingWrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 24,
};

const loadingGlyph: React.CSSProperties = {
  fontSize: 28,
  color: INK_FAINT,
};

const loadingText: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 28,
  color: INK_FAINT,
};

const errorToast: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 24,
  transform: "translateX(-50%)",
  padding: "12px 16px",
  background: "rgba(31,27,21,0.92)",
  color: PARCHMENT,
  zIndex: 40,
  maxWidth: "min(640px, calc(100vw - 32px))",
};