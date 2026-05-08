# Snap-scroll playable UX redesign

**Date:** 2026-05-09
**Status:** approved, moving to implementation plan

## Why

The current playable flow is a phase-state machine that swaps the entire viewport between discrete screens (`idle → questionnaire → revealing → reveal-shown → scene-generating → scene-shown → ended`). Each transition is a hard cut; immersion breaks every time the page replaces itself; the chrome (settings panel, back button, bookshelf overlay) reads as four different conventions stacked on the same surface.

Users have to learn the navigation. There is no sense of journey, only a sequence of unconnected screens.

This redesign reshapes the entire playable arc as **one continuous vertical document of full-viewport stages**, with three visual tiers, a commit-gated questionnaire, and a branching scene tree post-reveal.

## What changes (one-paragraph summary)

The whole journey — title → 3 chapter intros → 7 questions → reveal → N scenes → ending — becomes a single CSS scroll-snapped document. Each stage is a `min-height: 100vh` section. Selecting an option auto-scrolls to the next stage. Scrolling up revisits past stages. The questionnaire is editable until reveal commits; after reveal, scenes form a branching tree where alternate choices fork sibling branches the user can flip between with a top pager bar. Three visual tiers (Atmospheric / Reading / Theatrical) carry the rhythm: title and chapter intros breathe with painterly horizons, content stages stay calm and type-forward, and the reveal stage is a Genshin "Wish"-style theatrical peak.

## The new architecture

### Document model

The page is a single scroll container with vertically stacked stages:

```
.doc {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
.stage {
  min-height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: normal;
}
```

`min-height` (not fixed `height`) is the key choice — scenes can overflow into a taller stage; snap-scroll picks up at the next stage when the user crosses out the bottom. This solves the "what if the prose is long" problem without truncation or pagination.

`scroll-snap-stop: normal` lets the user scroll fluidly within a tall scene without snap interfering. `mandatory` snap still applies when crossing stage boundaries.

### Stage roster

For a default editorial run (variants `v1`, `v2-tight`):

| # | Stage | Tier |
|---|---|---|
| 1 | Title | Atmospheric |
| 2 | Chapter I intro (Mood) | Atmospheric |
| 3 | Q1 | Reading |
| 4 | Q2 | Reading |
| 5 | Q3 | Reading |
| 6 | Chapter II intro (Desire) | Atmospheric |
| 7 | Q4 | Reading |
| 8 | Q5 | Reading |
| 9 | Chapter III intro (Conflict) | Atmospheric |
| 10 | Q6 | Reading |
| 11 | Q7 | Reading |
| 12 | Reveal | Theatrical |
| 13–N | Scene I, II, … (up to scene 10 hard-stop) | Reading |
| N+1 | Ending | Atmospheric |

The exact question split per chapter is read from `QuestionnaireSchema.chapterMeta` and `QuestionnaireSchema.steps[*].chapter`, not hard-coded in the layout — adding a new question or rebalancing chapters changes the stage roster automatically.

For variant `v2-wish`:

- The questionnaire schema differs (`wishQuestionnaire`), but the stage layout is the same in shape.
- The reveal stage is the **Wish + direction pick combined**: theatrical Wish frame, plus the three direction cards rendered as Reading-tier panels stacked below the character. Picking a direction commits the run and advances to Scene I. (No separate direction-pick stage.)

### Visual tiers

Three tiers, each with shared structure but per-Vision palette tinting on the active character's element:

**Atmospheric (Whisper)** — title, chapter intros, ending
- Painterly two-mountain horizon (SVG), drifting wind streaks (per-element particle in MVP defaults to wind; other elements follow up)
- Gold corner ornaments (`❦`)
- Vision dot indicator top-right
- Letterboxed top/bottom shadow gradients
- Big serif display type (chapter / title / ending)
- Italic subtitle
- Scroll chevron at bottom

**Reading (calm cream)** — questions, scenes, v2-wish direction cards
- Warm cream gradient ground (`#ede4cf → #ddd2b6`)
- Vision color present only as a soft radial wash at corners (~12% opacity max)
- Small gold corners
- Vision mark in corner
- No horizon, no wind streaks, no letterbox — body stays type-forward
- Selected option / dropcap in Vision color, italic + Vision-color underline

**Theatrical (Wish)** — reveal stage only
- Deep night radial gradient (`#2a3858 → #14213d → #0a1228`)
- Conic-gradient gold rays
- Twinkling stars (CSS particles)
- Vision-colored silhouette (replaced by xAI portrait when ready)
- Gold filigree top corners (SVG)
- Calligraphic name in cream + gold-bright epithet
- "Walk into her world ↓" advance affordance

Per-Vision palette is a swap within each tier — Anemo teal becomes Pyro ember (`#ed5a3a`), Hydro blue (`#3d92e1`), Cryo (`#9fd3e8`), Electro (`#b886e0`), Geo (`#fab43c`), Dendro (`#a5c83b`).

## Interaction model

### Pre-reveal (questionnaire)

Linear and mutable.

- Selecting an option auto-scrolls to the next stage with smooth animation. (`element.scrollIntoView({ behavior: 'smooth', block: 'start' })`.)
- Scrolling up to a previous question re-renders that question with the existing answer pre-selected; tapping a different option simply overwrites the answer. No regen, no branching.
- The reveal stage shows a CTA / advance affordance ("Reveal what answered" or similar). Hitting it **commits**: triggers reveal generation and locks all upstream stages. (Scrolling alone does not commit — the user must explicitly opt in, since reveal is the irreversible threshold.)

### Reveal (commit gate)

- Generates the character (or, for v2-wish, deterministic pick + LLM `why` + 3 directions).
- Once committed, scrolling up to questionnaire stages renders them **read-only**: answers visible, options visible but disabled, with a small "— sealed at reveal —" notation in place of the option borders.
- Cannot un-commit within a run. To start over, user must use Start Over (which archives the run to Bookshelf and resets).

### Post-reveal (scenes)

Scenes form a **branching tree**.

**Data model:**

```ts
type SceneNode = {
  id: string;                  // stable
  parentId: string | null;     // null for Scene I
  depth: number;               // 1-indexed (Scene I = 1)
  choiceTaken: string | null;  // the parent's choice that led here; null on root
  prose: string;
  choices: string[];
  closing: boolean;
  summary?: string;
};

type SceneTree = {
  nodes: Record<string, SceneNode>;
  rootId: string;              // Scene I
  activePath: string[];        // ordered scene ids, root → current leaf
};
```

The `activePath` is what the document renders top-to-bottom. The full `nodes` map preserves every branch ever generated.

**Interactions:**

- Picking a choice in a scene that is the current leaf of `activePath`: generates a new child node, appends to path, scrolls to it.
- Scrolling up to scene N (where N < current leaf depth), then picking a choice:
  - If a child node already exists for that `(parentId, choiceTaken)` pair: switch `activePath` from depth N+1 onward to that branch's continuation. No regen.
  - If no child exists: generate a new child node, replace `activePath` from depth N+1 onward with `[newNode.id]`, scroll to it. The previously-active branch from depth N+1 onward is preserved in `nodes` and reachable via the pager.
- **Sibling switching at a depth that has multiple children** uses the top **pager bar**:
  - Visible only when the scene at depth N has siblings (i.e., its parent has > 1 child).
  - Renders dots, the choice that led to the active sibling, and `‹ ›` buttons.
  - `‹ ›` and arrow keys (`←` `→`) cycle through siblings without re-tapping a choice.
  - Switching siblings updates `activePath` from depth N onward to that sibling's most-recently-walked descendant chain.
- **Choices that have already been taken** show a filled dot prefix (`● `) and a Vision-color border, so the user can see which choices have spawned siblings without opening the pager.

### Streaming & loading

- **Reveal generation:** Wish stage is rendered immediately on commit, with breathing dots in place of the name and a faint "the wind is listening…" eyebrow. When the LLM response arrives, the name + epithet + nation row fade in. Portrait (xAI) replaces silhouette in-place when its async call resolves; failure leaves silhouette permanently.
- **Scene generation (initial OR sibling fork):** The destination Reading stage renders immediately with eyebrow + breathing dots in the prose area. Prose streams char-by-char (preserving the current streaming SSE behavior). Choices fade in below when the response completes. User can scroll back during streaming without interrupting.
- **Direction-pick (v2-wish only):** the combined Wish+directions stage shows breathing dots in the directions area while LLM generates `why` + 3 directions; cards fade in when ready.

### Chrome & escape hatches

- **Top-right HUD** — two icon buttons (lang, settings). Settings opens a small panel with provider, model, prompt-variant pickers. Hidden during the reveal animation; shown otherwise.
- **Bookshelf** — overlay (modal-like, not a stage). Reachable from title CTA and ending CTA only. Closes back to where it was opened from.
- **Start Over** — primary CTA on ending; also in the settings panel mid-run with a confirm prompt. Archives the run (full tree) to Bookshelf and resets.
- **No back button.** Scroll up replaces it. The current `BackButton` component is removed.
- **Quota badge** — small floating bottom-left when remaining quota < 3. Persistent.

## Component refactor map

| Current | New |
|---|---|
| [app/page.tsx](../../app/page.tsx) — phase switch | Rewritten as a vertical document of stage components, no phase switch |
| [hooks/useAdventure.ts](../../hooks/useAdventure.ts) — phase enum + linear scene array | Adds scene tree, `currentStageIndex`, branch nav (`switchSibling`, `forkAt`); preserves all generation logic |
| [components/teyvat/TitleScreen.tsx](../../components/teyvat/TitleScreen.tsx) | Becomes `TitleStage` (Atmospheric tier) |
| [components/teyvat/Questionnaire.tsx](../../components/teyvat/Questionnaire.tsx) — single multi-step component | Split into `ChapterIntroStage` (Atmospheric) + `QuestionStage` (Reading) — schema-driven; one `QuestionStage` per step |
| [components/teyvat/RevealCard.tsx](../../components/teyvat/RevealCard.tsx) | Becomes `RevealStage` (Theatrical / Wish) |
| [components/teyvat/DirectionPicker.tsx](../../components/teyvat/DirectionPicker.tsx) | Folded into `RevealStage` for v2-wish — reveal + directions on one Theatrical stage |
| [components/teyvat/SceneView.tsx](../../components/teyvat/SceneView.tsx) | Becomes `SceneStage` (Reading); adds top pager bar + arrow-key sibling switch |
| [components/teyvat/Ending.tsx](../../components/teyvat/Ending.tsx) | Becomes `EndingStage` (Atmospheric) |
| [components/teyvat/AdventureLog.tsx](../../components/teyvat/AdventureLog.tsx) | Removed — scrolling up replaces it |
| [components/teyvat/BackButton.tsx](../../components/teyvat/BackButton.tsx) | Removed |
| [components/teyvat/Bookshelf.tsx](../../components/teyvat/Bookshelf.tsx) | Kept; opened as overlay from title/ending |
| [lib/teyvat/theme.ts](../../lib/teyvat/theme.ts) | Adds tier-specific palette tokens (Atmospheric / Reading / Theatrical) on top of existing Vision palettes |
| (new) `lib/teyvat/stageTiers.ts` | Tier definitions, per-Vision palette resolution, shared CSS-in-JS helpers |
| (new) `lib/teyvat/sceneTree.ts` | SceneTree type + helpers (`createTree`, `appendChild`, `findChildByChoice`, `descendantsAlong`, etc.) |
| [lib/teyvat/scenes.ts](../../lib/teyvat/scenes.ts) — `AdventureState.scenes: Scene[]` | Updated: `AdventureState.tree: SceneTree` + a derived `activeScenes()` selector for back-compat |
| [lib/teyvat/storage.ts](../../lib/teyvat/storage.ts) | Persists tree (not just linear scenes); `archiveToLibrary` archives the full tree |

## Data model migration

`AdventureState.scenes: Scene[]` becomes `AdventureState.tree: SceneTree`. A migration in [lib/teyvat/storage.ts](../../lib/teyvat/storage.ts):

- On read: if the persisted shape has `scenes` (legacy), convert it to a single-path `SceneTree` where the path is the original array. New writes use the tree shape.
- On write: always tree shape; no dual-write.

The Bookshelf library entries get a `version` field. v1 entries (linear) are read as single-path trees on load. New entries are v2.

## Out of scope (follow-up)

These are explicitly deferred from MVP, in priority order:

1. **Per-element particle systems beyond wind** — Anemo wind streaks ship in MVP; Pyro embers / Hydro droplets / Cryo snow / Electro sparks / Geo dust / Dendro petals are follow-up. Until then, all Atmospheric stages use the wind streak as a generic atmosphere.
2. **Cross-fade transitions between palette themes** — when the v2-wish reveal swaps to the fated character's Vision palette, MVP just snaps; future cross-fade in 600–1200ms.
3. **Mobile-specific tuning** — CSS scroll-snap works on mobile out of the box; pager bar sizing for touch and hover-state alternatives are MVP. Beyond that (haptic, momentum tuning), follow up.
4. **Inline regen-while-stale visualization for the questionnaire** — not needed because the questionnaire is mutable-in-place pre-reveal; stale state never applies.
5. **Bookshelf rendering of tree shape** — MVP archives the tree but the Bookshelf list view shows only the active path. Follow-up: render the tree as an explorable graph.

## Risks & open questions

- **Snap-scroll fighting with scroll-into-view in long scenes.** When a scene is taller than the viewport and the user is mid-prose, programmatic `scrollIntoView` for "advance to next" should target the *next* stage, not re-snap the current one. Verify with manual testing during implementation.
- **Mobile keyboard interaction with arrow-key sibling switch.** Bind `keydown` on the document only when no input is focused. (The product has no text inputs in the playable flow today, but settings might.)
- **Scene tree growth** — if a user explores aggressively, the tree can grow. No hard cap in MVP. If trees become a memory concern, follow-up adds a soft cap and a "trim oldest unvisited branch" eviction.
- **Streaming-during-scroll.** If the user scrolls back to a past scene mid-stream of the new scene, the streaming continues; UI shows a small indicator that a generation is in progress so they're not surprised when the page later updates.
- **Variant changes mid-run.** If the user changes prompt variant in settings during a run, the tree's existing nodes don't retroactively change. The next generation uses the new variant. (Same behavior as today.)

## Acceptance criteria

- The existing happy path (start → questionnaire → reveal → 10 scenes → ending) works end-to-end on the new model with no functional regressions.
- Scrolling up to a question pre-commit re-renders with prior answer; changing it overwrites; no LLM call.
- Hitting reveal commits; scrolling up to questionnaire shows read-only stages with sealed indication.
- Picking the *same* choice on a scene that is the current leaf advances normally.
- Scrolling up to scene N, picking a *different* choice, generates a new sibling; the original branch is reachable via the pager.
- Switching siblings via the pager re-renders depths N+ with that branch's continuation, no LLM call when nodes already exist.
- Long scene prose overflows the viewport into a taller stage; user can scroll through it and snap-scroll picks up at the next stage on scroll-down past the bottom.
- Per-Vision palette correctly themes Atmospheric, Reading, and Theatrical tiers.
- Refresh during a run restores the active path AND preserves the rest of the tree.
- Existing Bookshelf entries (legacy linear) load correctly via the migration shim.
