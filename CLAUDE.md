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

- Prompt construction lives in `lib/teyvat/prompts.ts`.
- `buildRevealPrompt(...)` + `parseReveal(...)` handle the character reveal card.
- `buildScenePrompt(...)` + `parseSceneStream(...)` handle scene generation and streaming-tag parsing.
- The reveal prompt contains the editable soft mapping table from questionnaire answers to in-world signals.

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
- [lib/teyvat/prompts.ts](lib/teyvat/prompts.ts) — reveal/scene prompt builders and parsers
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