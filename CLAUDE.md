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

- `app/page.tsx` walks the user through Title -> Questionnaire -> Reveal -> Scene loop -> Ending.
- `hooks/useAdventure.ts` owns the runtime phases: `idle -> questionnaire -> revealing -> reveal-shown -> scene-generating -> scene-shown -> ended`.
- Reveal generation is a single non-streaming JSON call with one corrective retry on malformed JSON.
- Framing is rolled per run as `protagonist` or `companion`.
- Scene generation is a single scene-at-a-time call using tagged sections: `<scene>`, `<choices>`, `<closing>`, and `<summary>`.
- The scene parser tolerates a missing `</scene>` tag by treating `<choices>` as the scene terminator.
- Pacing guidance in `lib/teyvat/prompts.ts` escalates closure pressure across scenes and hard-stops at scene 10.

### Prompting

- Prompt construction lives in `lib/teyvat/prompts.ts` (public dispatch + parsers) and `lib/teyvat/promptVariants.ts` (variant registry and per-variant builders).
- `buildRevealPrompt(...)` + `parseReveal(...)` handle the character reveal card.
- `buildScenePrompt(...)` + `parseSceneStream(...)` handle scene generation and streaming-tag parsing.
- Both `buildRevealPrompt` and `buildScenePrompt` accept an optional trailing `variantId` and dispatch through `PROMPT_VARIANTS`. Omitting it is equivalent to `DEFAULT_PROMPT_VARIANT_ID` (`"v1"`), so existing callers and tests keep working.
- The default `v1` variant is the editorial baseline and includes the soft mapping table; `v2-tight` is a concise alternate (drops the mapping table, hardens constraints) and acts as the second arm of the A/B split.
- The reveal prompt enforces nation-specific naming conventions, bans element words in the `name` field, and rejects names that collide with the canonical Genshin roster via `lib/teyvat/canonNames.ts`. The reveal schema includes a `title` epithet field rendered with `「」` brackets in Chinese and em-dashes in English.

### Prompt Switch System

- Variant resolution lives in `lib/teyvat/promptSwitch.ts`.
- Precedence is URL `?promptVariant=<id>` (debug override, not persisted) → `localStorage["destiny-prompt-variant"]` (sticky A/B assignment) → weighted-random pick across `PROMPT_VARIANTS.weight` (persisted on first roll so the user stays on the same arm).
- `useAdventure.ts` calls `resolvePromptVariant()` once on mount and passes the resolved id into both prompt builders.
- The settings panel in `app/page.tsx` exposes a "Prompt variant" picker for in-app debugging; selecting a variant calls `setPromptVariant(...)` which writes to localStorage so the change is sticky.
- To add a new variant: implement `buildReveal` / `buildScene` in `promptVariants.ts`, append it to `PROMPT_VARIANTS` with a `weight`, and the resolver, picker, and tests pick it up automatically.

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
- In-progress adventures are also saved locally through `lib/teyvat/storage.ts` so refresh can resume a run.

## Key Files

- [app/page.tsx](app/page.tsx) — top-level Teyvat flow and settings panel
- [app/api/generate/route.ts](app/api/generate/route.ts) — provider proxy, quota handling, and streaming pass-through
- [app/api/telemetry/route.ts](app/api/telemetry/route.ts) — optional best-effort telemetry ingress
- [hooks/useAdventure.ts](hooks/useAdventure.ts) — reveal and scene orchestration
- [components/teyvat/TitleScreen.tsx](components/teyvat/TitleScreen.tsx) — title screen
- [components/teyvat/Questionnaire.tsx](components/teyvat/Questionnaire.tsx) — staged questionnaire UI
- [components/teyvat/RevealCard.tsx](components/teyvat/RevealCard.tsx) — character reveal UI
- [components/teyvat/SceneView.tsx](components/teyvat/SceneView.tsx) — scene prose and choice UI
- [components/teyvat/AdventureLog.tsx](components/teyvat/AdventureLog.tsx) — expandable prior-scene log
- [components/teyvat/Ending.tsx](components/teyvat/Ending.tsx) — ending screen with replay/new-run actions
- [lib/teyvat/questionnaire.ts](lib/teyvat/questionnaire.ts) — questionnaire schema and chapter metadata
- [lib/teyvat/prompts.ts](lib/teyvat/prompts.ts) — public reveal/scene prompt builders and parsers; dispatches by variant id
- [lib/teyvat/promptVariants.ts](lib/teyvat/promptVariants.ts) — prompt variant registry (v1 baseline, v2-tight alternate)
- [lib/teyvat/promptSwitch.ts](lib/teyvat/promptSwitch.ts) — variant resolver: URL → localStorage → weighted-random sticky pick
- [lib/teyvat/character.ts](lib/teyvat/character.ts) — revealed character types and validation
- [lib/teyvat/scenes.ts](lib/teyvat/scenes.ts) — scene/adventure types
- [lib/teyvat/storage.ts](lib/teyvat/storage.ts) — local adventure persistence
- [lib/teyvat/elements.ts](lib/teyvat/elements.ts) — Vision/nation/weapon enums and palette table
- [lib/teyvat/theme.ts](lib/teyvat/theme.ts) — parchment theme tokens and per-Vision colors
- [i18n/index.tsx](i18n/index.tsx) — English and Simplified Chinese UI copy

## Working Style Notes

- Keep README and CLAUDE aligned; do not let one describe an older runtime than the other.
- If you change the questionnaire schema, prompt flow, provider surface, telemetry flow, or rate limiting, update docs in the same task.
- Preserve the editorial tone of the product. Avoid flattening the world into generic fantasy copy.