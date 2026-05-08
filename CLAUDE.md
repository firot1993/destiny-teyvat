# CLAUDE.md

This file gives Claude Code project-specific guidance for working in this repository.

For the product overview, setup, commands, environment variables, and high-level runtime flow, treat [README.md](README.md) as the source of truth. When the product behavior or stack changes, update the README in the same pass.

## Documentation

Write durable project docs into `doc/` when the work is substantial. Match the content to the subfolder:

- `doc/plan/` — implementation plans for non-trivial work before coding starts
- `doc/architecture/` — notes on prompt flow, module boundaries, provider integration, and system behavior
- `doc/worklog/` — dated logs of meaningful work, tradeoffs, and dead ends

When to write:

- Before a multi-step implementation, add a plan in `doc/plan/`
- After meaningful work, append to the day's file in `doc/worklog/`
- When the system design changes, update the relevant file in `doc/architecture/`

Skip docs for trivial edits and typo-only changes. Prefer updating an existing file over creating a near-duplicate.

`docs/superpowers/` exists in the repo, but it contains skill-generated artifacts from earlier sessions. Keep human-maintained project context in `doc/` unless the task explicitly targets those generated files.

## Runtime Notes

### Questionnaire Shape

- The questionnaire is the Teyvat reveal questionnaire.
- It lives in `lib/teyvat/questionnaire.ts` and per-variant schemas in `lib/teyvat/questionnaires/`.
- It contains seven single-select questions across three chapters: Mood, Desire, and Conflict.
- Answers are stored as a `TeyvatAnswers` map (`stepId -> option.value`) and passed directly into `buildRevealPrompt(...)`.

### Generation Flow

- `app/page.tsx` is a **snap-scroll document** — a single `overflow-y: scroll; scroll-snap-type: y mandatory` container holding one full-viewport stage per screen. The document grows as new stages are appended; `scrollToStageDelta(±1)` drives programmatic navigation.
- Stages are built from three visual tiers: `atmospheric` (parchment, title + chapter intros), `reading` (cream, questions + scenes), `theatrical` (deep ink, reveal). Palette tokens come from `lib/teyvat/stageTiers.ts` keyed by the active Vision element.
- `hooks/useAdventure.ts` owns internal phases (`idle -> questionnaire -> revealing | directions-generating -> reveal-shown | direction-pick -> scene-generating -> scene-shown -> ended`) but the UI is not phase-gated — it builds all stages and the document scrolls to the current position.
- `useAdventure.ts` exposes: `currentStageIndex`, `answers`, `updateAnswer`, `commitReveal`, `enterWorld`, `pickDirection`, `chooseChoice` (with branching), `switchToSibling`, `siblingsAt`, `takenChoicesAt`, `scrollToStageDelta`, and `docRef`.
- Scene state is a tree (`SceneTree`) — not a flat array. The active path is `SceneTree.activePath`; helper `activeScenesOf(state)` returns it as an ordered array. Branching is first-class: choosing a new option on a past scene forks a new sibling; choosing an existing option switches to that sibling without an LLM call.
- Reveal is the commit gate: the questionnaire is mutable (answers can be edited) until `commitReveal()` is called. Once committed, the seal is permanent; `isCommitted` drives the `sealed` prop on each `QuestionStage`.
- Back-nav with answer-hash caching: `submitQuestionnaire` saves the latest answers to `destiny-last-answers` and the latest reveal/fated reveal to `destiny-last-reveal` / `destiny-last-fated` (keyed by a stable hash of the answers). When the user resubmits the same answers, the cached pick is restored without an LLM call. `startOver` clears every cache.
- Reveal generation (single-character variants) is a non-streaming JSON call with one corrective retry on malformed JSON.
- Fated-reveal generation (v2-wish) deterministically picks the top-scoring canon character via `pickFatedCharacter(CANON_ROSTER, answers)`, then makes a single non-streaming JSON call against `buildFatedRevealPrompt(...)`. `parseFatedReveal` validates a non-empty `why` plus exactly 3 directions with unique ids and non-empty title/hook fields, with the same corrective-retry pattern as the editorial reveal.
- After a successful reveal, `useAdventure.ts` fires a best-effort `/api/imagine` call to generate a Genshin-style character portrait. For v2-wish the same `/api/imagine` route is called once for the fated character. Image generation never blocks the flow and silently no-ops on failure.
- Framing is rolled per run as `protagonist` or `companion` for editorial variants. v2-wish always runs as `protagonist` with transmigration framing.
- Scene generation is a single scene-at-a-time call using tagged sections: `<scene>`, `<choices>`, `<closing>`, and `<summary>`.
- The scene parser tolerates a missing `</scene>` tag by treating `<choices>` as the scene terminator.
- Pacing guidance in `lib/teyvat/prompts.ts` escalates closure pressure across scenes and hard-stops at scene 10.
- For v2-wish, the picked direction is persisted on `AdventureState.storyDirection` and threaded into every `buildSceneWish` prompt as a story-arc anchor — the model is asked to keep that arc consistent across all scenes.

### Prompting

- Prompt construction lives in `lib/teyvat/prompts.ts` (public dispatch + parsers), `lib/teyvat/promptVariants.ts` (variant registry and per-variant builders), and `lib/teyvat/candidates.ts` (the v2-wish-only prefilter, fated-character picker, fated-reveal prompt builder, and parser).
- `buildRevealPrompt(...)` + `parseReveal(...)` handle the character reveal card for single-reveal variants.
- `pickFatedCharacter(...)` + `buildFatedRevealPrompt(...)` + `parseFatedReveal(...)` handle the v2-wish fated-reveal call. The prefilter narrows `CANON_ROSTER` to ~6-10 entries by tag overlap and the picker takes the top-1 deterministically, then a single combined call returns a `why` line plus exactly 3 distinct story directions (id / title / hook). The user picks one direction; that direction becomes the awakening hook and the persistent story-arc anchor.
- `buildScenePrompt(...)` + `parseSceneStream(...)` handle scene generation and streaming-tag parsing.
- Both `buildRevealPrompt` and `buildScenePrompt` accept an optional trailing `variantId` and dispatch through `PROMPT_VARIANTS`. Omitting it is equivalent to `DEFAULT_PROMPT_VARIANT_ID` (`"v1"`), so existing callers and tests keep working.
- Each registered variant declares `capabilities`: which questionnaire schema, what reveal contract (`single` vs `fated-with-directions`), framing, and scene tone. Variants with `capabilities.reveal.kind === "fated-with-directions"` go through the direction-pick path instead of returning a single character.
- The default `v1` variant is the editorial baseline and includes the soft mapping table; `v2-tight` is a concise alternate (drops the mapping table, hardens constraints) and acts as the second arm of the A/B split. `v2-wish` is the wish-fulfillment 爽文 variant, opt-in via the picker (weight 0, never randomly assigned).
- The single-reveal prompt enforces nation-specific naming conventions, bans element words in the `name` field, and rejects names that collide with the canonical Genshin roster via `lib/teyvat/canonNames.ts`. The reveal schema includes a `title` epithet field rendered with `「」` brackets in Chinese and em-dashes in English. v2-wish ignores all of this — its character is sourced from `CANON_ROSTER`, not generated.

### Prompt Switch System

- Variant resolution lives in `lib/teyvat/promptSwitch.ts`.
- Precedence is URL `?promptVariant=<id>` (debug override, not persisted) → `localStorage["destiny-prompt-variant"]` (sticky A/B assignment) → weighted-random pick across `PROMPT_VARIANTS.weight` (persisted on first roll so the user stays on the same arm).
- Variants with `weight === 0` are registered but excluded from the random roll; they're opt-in via the picker. `v2-wish` is currently the only weight-0 variant.
- `useAdventure.ts` calls `resolvePromptVariant()` once on mount, derives `questionnaireSchema` from the active variant's capabilities, and passes the resolved id into the prompt builders.
- The settings panel in `app/page.tsx` is exposed via a gear icon (⚙) in the top-right HUD; clicking the icon toggles the panel open/closed. It exposes provider/model/variant pickers for in-app debugging; selecting a variant calls `setPromptVariant(...)` which writes to localStorage so the change is sticky.
- To add a new variant: implement `buildReveal` / `buildScene` in `promptVariants.ts`, declare its `capabilities`, append it to `PROMPT_VARIANTS` with a `weight`, and add a row to `variantFamily(...)` if it should appear in a Bookshelf filter. The resolver, picker, and tests pick it up automatically.

### Providers And Quotas

- The UI provider/model picker is defined in `lib/constants.ts`.
- The shipped UI presets are OpenRouter, DeepSeek, and xAI.
- `lib/providers.ts` still contains Anthropic and Gemini adapters for direct route use.
- `callProvider(...)` retries retryable upstream failures with exponential backoff.
- `callProviderWithFallbacks(...)` uses `FALLBACK_PROVIDERS` when configured.
- `app/api/generate/route.ts` applies per-IP throttling, the global daily quota, and optional streaming SSE pass-through.
- The client surfaces low remaining quota counts from the daily quota headers.

### Telemetry And Persistence

- Telemetry is optional and should never break the user-facing flow.
- `lib/db.ts` returns `null` when `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are unset.
- `lib/telemetry.ts` remains best-effort and warns in development rather than surfacing errors to the user.
- In-progress adventures are saved locally through `lib/teyvat/storage.ts` so refresh can resume a run.
- Completed (or user-stopped) adventures are archived into a separate localStorage "library" by `archiveToLibrary(...)` and surfaced in the Bookshelf overlay (`components/teyvat/Bookshelf.tsx`), where users can browse prior runs and resume by character.

### Character Portraits

- `app/api/imagine/route.ts` proxies xAI's `grok-imagine-image` endpoint and returns a single image URL. It requires `XAI_API_KEY` and reuses the per-IP rate limiter; it returns 503 when the key is unset.
- The portrait prompt is built in `useAdventure.ts` from the revealed character's vision, nation, weapon, archetype, and bio, and explicitly suppresses any text/letters/watermarks in the image.
- `RevealStage.tsx` renders the portrait when available; the reveal stage stays usable while the image is still generating or if it fails.

## Key Files

- [app/page.tsx](app/page.tsx) — snap-scroll document: builds all stages into one scrollable container; contains the HUD (lang toggle + gear settings icon), Bookshelf overlay, and quota badge
- [app/api/generate/route.ts](app/api/generate/route.ts) — provider proxy, quota handling, and streaming pass-through
- [app/api/imagine/route.ts](app/api/imagine/route.ts) — xAI image generation proxy for reveal portraits
- [app/api/telemetry/route.ts](app/api/telemetry/route.ts) — optional best-effort telemetry ingress
- [hooks/useAdventure.ts](hooks/useAdventure.ts) — reveal, portrait, scene, branching, and library orchestration; exposes `currentStageIndex`, `chooseChoice`, `siblingsAt`, `takenChoicesAt`, `switchToSibling`
- [components/teyvat/Bookshelf.tsx](components/teyvat/Bookshelf.tsx) — archived-runs overlay (stories + characters tabs)
- [components/teyvat/BranchPager.tsx](components/teyvat/BranchPager.tsx) — sibling-branch pager shown above a scene when branches ≥ 2
- [components/teyvat/stages/TitleStage.tsx](components/teyvat/stages/TitleStage.tsx) — atmospheric-tier title screen stage
- [components/teyvat/stages/ChapterIntroStage.tsx](components/teyvat/stages/ChapterIntroStage.tsx) — chapter intro divider stage
- [components/teyvat/stages/QuestionStage.tsx](components/teyvat/stages/QuestionStage.tsx) — single-question stage with seal support
- [components/teyvat/stages/RevealStage.tsx](components/teyvat/stages/RevealStage.tsx) — theatrical-tier reveal: loading animation, commit gate, character display, v2-wish directions
- [components/teyvat/stages/SceneStage.tsx](components/teyvat/stages/SceneStage.tsx) — reading-tier scene: prose, streaming cursor (▋), choices, branch pager, arrow-key nav
- [components/teyvat/stages/EndingStage.tsx](components/teyvat/stages/EndingStage.tsx) — ending screen with replay/new-run actions
- [components/teyvat/stages/StageWrapper.tsx](components/teyvat/stages/StageWrapper.tsx) — shared full-viewport wrapper with scroll-snap alignment and tier-aware styling
- [lib/teyvat/questionnaire.ts](lib/teyvat/questionnaire.ts) — `QuestionnaireSchema` type and editorial-schema re-exports
- [lib/teyvat/questionnaires/](lib/teyvat/questionnaires/) — per-variant questionnaire schemas (`editorialQuestionnaire`, `wishQuestionnaire`)
- [lib/teyvat/canonRoster.ts](lib/teyvat/canonRoster.ts) — canonical Genshin character roster used by v2-wish (~25 entries with power-fantasy tags)
- [lib/teyvat/candidates.ts](lib/teyvat/candidates.ts) — v2-wish prefilter, deterministic top-1 picker (`pickFatedCharacter`), fated-reveal prompt builder, and `{ why, directions[3] }` parser
- [lib/teyvat/prompts.ts](lib/teyvat/prompts.ts) — public reveal/scene/fated-reveal surface; dispatches by variant id
- [lib/teyvat/promptVariants.ts](lib/teyvat/promptVariants.ts) — prompt variant registry (v1 baseline, v2-tight alternate, v2-wish wish-fulfillment) + `variantFamily(...)` helper
- [lib/teyvat/promptSwitch.ts](lib/teyvat/promptSwitch.ts) — variant resolver: URL → localStorage → weighted-random sticky pick
- [lib/teyvat/stageTiers.ts](lib/teyvat/stageTiers.ts) — three visual tiers (`atmospheric`, `reading`, `theatrical`) and per-Vision palette tokens
- [lib/teyvat/character.ts](lib/teyvat/character.ts) — revealed character types and validation
- [lib/teyvat/scenes.ts](lib/teyvat/scenes.ts) — scene/adventure types; `SceneTree`, `SceneNode`, `activeScenesOf`, `forkAt`, `switchSibling`
- [lib/teyvat/storage.ts](lib/teyvat/storage.ts) — local adventure persistence and Bookshelf library archive
- [lib/teyvat/elements.ts](lib/teyvat/elements.ts) — Vision/nation/weapon enums and palette table
- [lib/teyvat/theme.ts](lib/teyvat/theme.ts) — parchment theme tokens and per-Vision colors
- [i18n/index.tsx](i18n/index.tsx) — English and Simplified Chinese UI copy

## Working Style Notes

- Keep README and CLAUDE aligned; do not let one describe an older runtime than the other.
- If you change the questionnaire schema, prompt flow, provider surface, image generation, library archive, telemetry flow, or rate limiting, update docs in the same task.
- Preserve the editorial tone of the product. Avoid flattening the world into generic fantasy copy.