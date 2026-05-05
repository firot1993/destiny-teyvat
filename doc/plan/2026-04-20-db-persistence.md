# DB Persistence for LLM Fine-Tuning — 2026-04-20

## Goal

Capture every generation attempt — inputs, curation choices, intermediate LLM responses, final story, and user rating — in Postgres so we can export a fine-tuning dataset.

## Decisions

- **Storage**: Supabase-managed Postgres (local dev uses Supabase CLI's dockerized Postgres for parity).
- **User ID**: random UUID in `localStorage` (`destiny-session-uuid`). No IP, no cookies, no auth.
- **Consent**: always-on capture with anonymous identifiers; disclosure in the onboarding form + README + `doc/architecture/telemetry-and-persistence.md`.
- **Scope**: questionnaire answers, Big Five, guidance, scan fragments (all 10 with final status + chamber order), curation answers, author voice, every LLM request/response, final story, thumbs-up/down rating.

## Schema (two tables)

- `sessions` — one row per run; JSONB for flexible shapes; status progresses `scanning → denoising → complete`.
- `llm_calls` — append-only log of every provider call tagged with `(phase, step_index, prompt, response, params, latency_ms)`.

Full DDL: `supabase/migrations/20260420000000_initial_schema.sql`.

## Write path

- **Client UUID**: `lib/sessionId.ts::getOrCreateSessionUuid()` on mount.
- **Session start**: `/api/telemetry` `{type: "session-start"}` right before scan; returns the Postgres session id.
- **Every LLM call**: `/api/generate` accepts `telemetry: {sessionId, phase, stepIndex}` and fire-and-forget writes an `llm_calls` row.
- **Curate complete**: `/api/telemetry` `{type: "curate-complete"}` with bullet snapshot + curation answers + author voice.
- **Story complete**: `/api/telemetry` `{type: "story-complete"}` with the final cleaned trajectory.
- **Rate**: `StoryRating` component POSTs `{type: "rate", rating: "like"|"dislike"}`.

All telemetry helpers in `lib/telemetry.ts` swallow DB errors — persistence must never break generation. When env vars are unset, `getDb()` returns null and every helper is a no-op.

## Files touched

- New: `supabase/config.toml`, `supabase/migrations/20260420000000_initial_schema.sql`, `lib/db.ts`, `lib/telemetry.ts`, `lib/sessionId.ts`, `app/api/telemetry/route.ts`, `components/StoryRating.tsx`, `doc/architecture/telemetry-and-persistence.md`.
- Modified: `app/api/generate/route.ts`, `hooks/useGeneration.ts`, `app/page.tsx`, `components/InputForm.tsx`, `i18n/index.tsx`, `package.json`, `.env.local.example`, `README.md`.

## Follow-ups

- Consider a Supabase Row Level Security policy if/when we expose a read-only analytics tool to the team.
- Add a `scripts/export-finetuning-jsonl.ts` helper once we're ready to do a fine-tune run.
- Investigate whether abandoned sessions (`status ≠ 'complete'`) are useful training signal or noise; currently they stay in the table.
