"use client";

import { useEffect, useRef, useState } from "react";
import { useAdventure } from "@/hooks/useAdventure";
import { useI18n } from "@/i18n";
import { DEFAULT_PROVIDER, PROVIDERS } from "@/lib/constants";
import { paletteFor, type TierPalette } from "@/lib/teyvat/stageTiers";
import { TitleStage } from "@/components/teyvat/stages/TitleStage";
import { QuestionStage } from "@/components/teyvat/stages/QuestionStage";
import { RevealStage } from "@/components/teyvat/stages/RevealStage";
import { SceneStage } from "@/components/teyvat/stages/SceneStage";
import { EndingStage } from "@/components/teyvat/stages/EndingStage";
import { Bookshelf } from "@/components/teyvat/Bookshelf";
import { StoryProgressVeil } from "@/components/teyvat/effects/StoryProgressVeil";
import { activeScenesOf } from "@/lib/teyvat/scenes";
import {
  paginateSceneText,
  shouldAutoScrollAfterSceneUpdate,
} from "@/lib/teyvat/scenePagination";
import { INK, INK_FAINT, PARCHMENT } from "@/lib/teyvat/theme";

export default function Page() {
  const { t, lang, toggleLang } = useI18n();
  const adv = useAdventure();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Pick the active vision; fall back to Anemo for pre-reveal stages.
  const vision = adv.character?.vision ?? adv.fatedCharacter?.vision ?? "Anemo";
  const atmospheric = paletteFor("atmospheric", vision);
  const reading = paletteFor("reading", vision);
  const theatrical = paletteFor("theatrical", vision);

  const schema = adv.questionnaireSchema;
  const sealed = adv.isCommitted;
  const answeredQuestionCount = schema.steps.reduce((count, step) => {
    return adv.answers[step.id] ? count + 1 : count;
  }, 0);

  const scenes = adv.adventure ? activeScenesOf(adv.adventure) : [];

  // Auto-scroll to a newly appended scene.
  const prevSceneProgressRef = useRef({ count: 0, loadingScene: false });
  useEffect(() => {
    const count = scenes.length;
    const previous = prevSceneProgressRef.current;
    if (
      shouldAutoScrollAfterSceneUpdate({
        previousSceneCount: previous.count,
        currentSceneCount: count,
        wasGeneratingScene: previous.loadingScene,
        isGeneratingScene: adv.loading.scene,
      })
    ) {
      adv.scrollToStageDelta(1);
    }
    prevSceneProgressRef.current = { count, loadingScene: adv.loading.scene };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes.length, adv.loading.scene]);

  // Build the linear list of stages.
  const stages: React.ReactNode[] = [];

  // 1. Title
  stages.push(
    <TitleStage
      key="title"
      palette={atmospheric}
      hasSavedAdventure={adv.hasSavedAdventure}
      hasLibrary={adv.library.length > 0}
      onBegin={() => adv.scrollToStageDelta(1)}
      onResume={adv.resumeAdventure}
      onOpenBookshelf={adv.openBookshelf}
    />
  );

  // 2. Questions — chapter context lives in each question's eyebrow
  schema.steps.forEach((step, i) => {
    const questionStageIndex = stages.length;
    stages.push(
      <QuestionStage
        key={step.id}
        palette={reading}
        step={step}
        stepNumber={i + 1}
        totalSteps={schema.steps.length}
        answeredCount={answeredQuestionCount}
        selectedValue={adv.answers[step.id]}
        language={lang}
        sealed={sealed}
        isActiveStage={adv.currentStageIndex === questionStageIndex}
        onPick={(value) => {
          adv.updateAnswer(step.id, value);
          adv.scrollToStageDelta(1);
        }}
        onBack={() => adv.scrollToStageDelta(-1)}
      />
    );
  });

  // 3. Reveal stage
  stages.push(
    <RevealStage
      key="reveal"
      palette={theatrical}
      loading={adv.loading.reveal}
      character={adv.character}
      fatedCharacter={adv.fatedCharacter}
      imageUrl={adv.characterImageUrl}
      revealReason={adv.revealReason}
      directions={adv.storyDirections}
      language={lang}
      committed={adv.isCommitted}
      enteringWorld={adv.loading.scene}
      onCommit={() => void adv.commitReveal(lang)}
      onAdvance={() => void adv.enterWorld(lang)}
      onPickDirection={(id) => void adv.pickDirection(id, lang)}
    />
  );

  // 4. Scenes — one stage per active-path scene
  scenes.forEach((scene, idx) => {
    if (idx === 0 && !adv.isCommitted) return; // skip empty root pre-commit
    const scenePages = paginateSceneText(scene.text);
    scenePages.forEach((pageText, pageIndex) => {
      const isLastPage = pageIndex === scenePages.length - 1;
      const stageIndexHere = stages.length;
      stages.push(
        <SceneStage
          key={`scene-${idx}-page-${pageIndex}`}
          palette={reading}
          sceneNumber={scene.sceneNumber}
          scenePageNumber={pageIndex + 1}
          scenePageCount={scenePages.length}
          prose={pageText}
          streamingText={adv.loading.scene && idx === scenes.length - 1 && isLastPage ? adv.streamingText : ""}
          streaming={adv.loading.scene && idx === scenes.length - 1 && isLastPage}
          closing={isLastPage ? scene.closing : false}
          choices={isLastPage ? scene.choices : []}
          takenChoices={adv.takenChoicesAt(scene.sceneNumber)}
          visionLabel={vision}
          pickedChoice={null}
          onPickChoice={(c) => void adv.chooseChoice(c, scene.sceneNumber, lang)}
          onStop={adv.stopHere}
          siblings={adv.siblingsAt(scene.sceneNumber)}
          onSwitchSibling={adv.switchToSibling}
          isActiveStage={adv.currentStageIndex === stageIndexHere}
        />
      );
    });
  });

  // 5. Ending
  if (adv.adventure?.ended) {
    stages.push(
      <EndingStage
        key="ending"
        palette={atmospheric}
        state={adv.adventure}
        language={lang}
        hasLibrary={adv.library.length > 0}
        onNewRun={adv.startOver}
        onOpenBookshelf={adv.openBookshelf}
      />
    );
  }

  const showQuota = adv.dailyRemaining !== null && adv.dailyRemaining < 3;

  return (
    <main>
      <div data-testid="story-sky" aria-hidden="true" style={storySkyStyle(reading)} />

      {/* HUD: lang toggle + settings gear */}
      <div style={settingsWrap}>
        <button type="button" style={langButton} onClick={toggleLang}>
          {lang === "en" ? "中文" : "EN"}
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            style={gearButton}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
          {settingsOpen && (
            <div style={settingsPanel}>
              <span style={settingsLabel}>{t("settings")}</span>
              <label style={settingsField}>
                <span>{t("provider_label")}</span>
                <select
                  value={adv.provider}
                  onChange={(e) => adv.setProvider(e.target.value)}
                >
                  {Object.keys(PROVIDERS).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label style={settingsField}>
                <span>{t("model_label")}</span>
                <select value={adv.model} onChange={(e) => adv.setModel(e.target.value)}>
                  {(PROVIDERS[adv.provider] ?? PROVIDERS[DEFAULT_PROVIDER]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label style={settingsField}>
                <span>{t("prompt_variant_label")}</span>
                <select
                  value={adv.promptVariant}
                  onChange={(e) => adv.setPromptVariant(e.target.value)}
                  title={adv.availablePromptVariants.find((v) => v.id === adv.promptVariant)?.description}
                >
                  {adv.availablePromptVariants.map((v) => (
                    <option key={v.id} value={v.id} title={v.description}>{v.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Quota badge */}
      {showQuota && (
        <div style={quotaBadge}>
          {adv.dailyRemaining} {t("quota_low")}
          {adv.dailyLimit ? ` / ${adv.dailyLimit}` : ""}
        </div>
      )}

      <StoryProgressVeil docRef={adv.docRef} palette={reading} />

      {/* Snap-scroll document */}
      <div ref={adv.docRef} data-doc className="snap-scroll-doc" style={docStyle}>
        {stages.map((s, i) => (
          <div key={i} data-stage data-stage-index={i}>
            {s}
          </div>
        ))}
      </div>

      {/* Bookshelf overlay */}
      {adv.bookshelfOpen && (
        <Bookshelf
          library={adv.library}
          onResume={adv.loadFromLibrary}
          onClose={adv.closeBookshelf}
        />
      )}

      {/* Error toast */}
      {adv.error && <div style={errorToast}>{adv.error}</div>}
    </main>
  );
}

const docStyle: React.CSSProperties = {
  height: "100vh",
  overflowY: "auto",
  scrollSnapType: "y mandatory",
  scrollBehavior: "smooth",
  position: "relative",
  zIndex: 1,
  background: "transparent",
};

function storySkyStyle(palette: TierPalette): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    background: palette.ground,
    transform: "translateZ(0)",
  };
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

const gearButton: React.CSSProperties = {
  border: "1px solid rgba(31,27,21,0.12)",
  background: "rgba(255,255,255,0.42)",
  color: INK,
  padding: "8px 10px",
  fontSize: 15,
  cursor: "pointer",
  lineHeight: 1,
};

const settingsPanel: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: 220,
  padding: 12,
  border: "1px solid rgba(31,27,21,0.12)",
  background: "rgba(245,236,217,0.96)",
  backdropFilter: "blur(10px)",
  display: "grid",
  gap: 10,
  zIndex: 30,
  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
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
