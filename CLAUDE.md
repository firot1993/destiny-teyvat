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
- It lives in `lib/teyvat/questionnaire.ts` and `components/teyvat/Questionnaire.tsx`.
- It contains seven single-select questions across three chapters: Mood, Desire, and Conflict.
- Answers are stored as a `TeyvatAnswers` map (`stepId -> option.value`) and passed directly into `buildRevealPrompt(...)`.

### Generation Flow

- `app/page.tsx` walks the user through Title -> Questionnaire -> Reveal (or Candidate-pick for v2-wish) -> Scene loop -> Ending, with a Bookshelf overlay reachable from the title.
- `hooks/useAdventure.ts` owns the runtime phases: `idle -> bookshelf | questionnaire -> revealing | candidates-generating -> reveal-shown | candidate-pick -> scene-generating -> scene-shown -> ended`. The candidates branch is taken whenever the active variant declares `capabilities.reveal.kind === "candidates"`; reveal-shown is skipped in that branch because the picked hook is the reveal.
- Reveal generation (single-character variants) is a non-streaming JSON call with one corrective retry on malformed JSON.
- Candidate generation (v2-wish) is a non-streaming JSON call against a pre-filtered slice of `CANON_ROSTER`; `parseCandidates` validates 3-5 entries with known ids and non-empty hooks, with the same corrective-retry pattern.
- After a successful reveal, `useAdventure.ts` fires a best-effort `/api/imagine` call to generate a Genshin-style character portrait. For v2-wish the same `/api/imagine` route is called once per candidate at gallery render. Image generation never blocks the flow and silently no-ops on failure.
- Framing is rolled per run as `protagonist` or `companion` for editorial variants. v2-wish always runs as `protagonist` with transmigration framing.
- Scene generation is a single scene-at-a-time call using tagged sections: `<scene>`, `<choices>`, `<closing>`, and `<summary>`.
- The scene parser tolerates a missing `</scene>` tag by treating `<choices>` as the scene terminator.
- Pacing guidance in `lib/teyvat/prompts.ts` escalates closure pressure across scenes and hard-stops at scene 10.

### Prompting

- Prompt construction lives in `lib/teyvat/prompts.ts` (public dispatch + parsers), `lib/teyvat/promptVariants.ts` (variant registry and per-variant builders), and `lib/teyvat/candidates.ts` (the v2-wish-only candidate pre-filter, prompt builder, and parser).
- `buildRevealPrompt(...)` + `parseReveal(...)` handle the character reveal card for single-reveal variants.
- `buildCandidatesPrompt(...)` + `parseCandidates(...)` handle the v2-wish candidate-suggestion call. The pre-filter narrows `CANON_ROSTER` to ~6-10 entries by tag overlap, then the model picks 3-5 and writes a transmigration awakening hook for each.
- `buildScenePrompt(...)` + `parseSceneStream(...)` handle scene generation and streaming-tag parsing.
- Both `buildRevealPrompt` and `buildScenePrompt` accept an optional trailing `variantId` and dispatch through `PROMPT_VARIANTS`. Omitting it is equivalent to `DEFAULT_PROMPT_VARIANT_ID` (`"v1"`), so existing callers and tests keep working.
- Each registered variant declares `capabilities`: which questionnaire schema, what reveal contract (`single` vs `candidates`), framing, and scene tone. Variants with `capabilities.reveal.kind === "candidates"` go through the candidate-pick path instead of returning a single character.
- The default `v1` variant is the editorial baseline and includes the soft mapping table; `v2-tight` is a concise alternate (drops the mapping table, hardens constraints) and acts as the second arm of the A/B split. `v2-wish` is the wish-fulfillment 爽文 variant, opt-in via the picker (weight 0, never randomly assigned).
- The single-reveal prompt enforces nation-specific naming conventions, bans element words in the `name` field, and rejects names that collide with the canonical Genshin roster via `lib/teyvat/canonNames.ts`. The reveal schema includes a `title` epithet field rendered with `「」` brackets in Chinese and em-dashes in English. v2-wish ignores all of this — its character is sourced from `CANON_ROSTER`, not generated.

### Prompt Switch System

- Variant resolution lives in `lib/teyvat/promptSwitch.ts`.
- Precedence is URL `?promptVariant=<id>` (debug override, not persisted) → `localStorage["destiny-prompt-variant"]` (sticky A/B assignment) → weighted-random pick across `PROMPT_VARIANTS.weight` (persisted on first roll so the user stays on the same arm).
- Variants with `weight === 0` are registered but excluded from the random roll; they're opt-in via the picker. `v2-wish` is currently the only weight-0 variant.
- `useAdventure.ts` calls `resolvePromptVariant()` once on mount, derives `questionnaireSchema` from the active variant's capabilities, and passes the resolved id into the prompt builders.
- The settings panel in `app/page.tsx` exposes a "Prompt variant" picker for in-app debugging; selecting a variant calls `setPromptVariant(...)` which writes to localStorage so the change is sticky.
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
- `RevealCard.tsx` renders the portrait when available; the reveal card stays usable while the image is still generating or if it fails.

## Key Files

- [app/page.tsx](app/page.tsx) — top-level Teyvat flow and settings panel
- [app/api/generate/route.ts](app/api/generate/route.ts) — provider proxy, quota handling, and streaming pass-through
- [app/api/imagine/route.ts](app/api/imagine/route.ts) — xAI image generation proxy for reveal portraits
- [app/api/telemetry/route.ts](app/api/telemetry/route.ts) — optional best-effort telemetry ingress
- [hooks/useAdventure.ts](hooks/useAdventure.ts) — reveal, portrait, scene, and library orchestration
- [components/teyvat/TitleScreen.tsx](components/teyvat/TitleScreen.tsx) — title screen
- [components/teyvat/Bookshelf.tsx](components/teyvat/Bookshelf.tsx) — archived-runs overlay (stories + characters tabs)
- [components/teyvat/CandidateGallery.tsx](components/teyvat/CandidateGallery.tsx) — v2-wish candidate-pick UI (3-5 cards with hooks and async portraits)
- [components/teyvat/Questionnaire.tsx](components/teyvat/Questionnaire.tsx) — staged questionnaire UI; takes a `QuestionnaireSchema` as a prop
- [components/teyvat/RevealCard.tsx](components/teyvat/RevealCard.tsx) — character reveal UI with optional portrait
- [components/teyvat/SceneView.tsx](components/teyvat/SceneView.tsx) — scene prose and choice UI
- [components/teyvat/AdventureLog.tsx](components/teyvat/AdventureLog.tsx) — expandable prior-scene log
- [components/teyvat/Ending.tsx](components/teyvat/Ending.tsx) — ending screen with replay/new-run actions
- [lib/teyvat/questionnaire.ts](lib/teyvat/questionnaire.ts) — `QuestionnaireSchema` type and editorial-schema re-exports
- [lib/teyvat/questionnaires/](lib/teyvat/questionnaires/) — per-variant questionnaire schemas (`editorialQuestionnaire`, `wishQuestionnaire`)
- [lib/teyvat/canonRoster.ts](lib/teyvat/canonRoster.ts) — canonical Genshin character roster used by v2-wish (~25 entries with power-fantasy tags)
- [lib/teyvat/candidates.ts](lib/teyvat/candidates.ts) — v2-wish candidate pre-filter, prompt builder, and parser
- [lib/teyvat/prompts.ts](lib/teyvat/prompts.ts) — public reveal/scene/candidates surface; dispatches by variant id
- [lib/teyvat/promptVariants.ts](lib/teyvat/promptVariants.ts) — prompt variant registry (v1 baseline, v2-tight alternate, v2-wish wish-fulfillment) + `variantFamily(...)` helper
- [lib/teyvat/promptSwitch.ts](lib/teyvat/promptSwitch.ts) — variant resolver: URL → localStorage → weighted-random sticky pick
- [lib/teyvat/character.ts](lib/teyvat/character.ts) — revealed character types and validation
- [lib/teyvat/scenes.ts](lib/teyvat/scenes.ts) — scene/adventure types
- [lib/teyvat/storage.ts](lib/teyvat/storage.ts) — local adventure persistence and Bookshelf library archive
- [lib/teyvat/elements.ts](lib/teyvat/elements.ts) — Vision/nation/weapon enums and palette table
- [lib/teyvat/theme.ts](lib/teyvat/theme.ts) — parchment theme tokens and per-Vision colors
- [i18n/index.tsx](i18n/index.tsx) — English and Simplified Chinese UI copy

## Working Style Notes

- Keep README and CLAUDE aligned; do not let one describe an older runtime than the other.
- If you change the questionnaire schema, prompt flow, provider surface, image generation, library archive, telemetry flow, or rate limiting, update docs in the same task.
- Preserve the editorial tone of the product. Avoid flattening the world into generic fantasy copy.