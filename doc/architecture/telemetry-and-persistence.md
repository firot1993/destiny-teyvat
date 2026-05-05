# Telemetry & Persistence

## Why

To fine-tune (or prompt-engineer against) the pipeline later we need a durable record of the inputs, the user's curation choices, every intermediate LLM call, the final story, and the user's rating. The app was previously stateless beyond Upstash Redis rate-limit counters; this adds a Postgres-backed dataset without introducing PII.

## Identity & privacy

- Each browser generates a random UUID on first load and stores it in `localStorage` under `destiny-session-uuid` (see `lib/sessionId.ts`). That value is the only user identifier we persist.
- **No IP address, no cookies, no auth, no browser fingerprint.** The UUID stays client-controlled — clearing site data or switching browsers yields a fresh one.
- The questionnaire answers themselves are intentionally vague (age band, mobility, "hidden edge", …) and carry no PII on their own.
- The disclosure lives in `components/InputForm.tsx` (the `data_notice` string) and in the README.

## Data model

Two tables in Postgres. DDL: `supabase/migrations/20260420000000_initial_schema.sql`.

### `sessions` (one row per generation attempt)

Holds the inputs, conditioning, final artifacts, and rating. Flexible fields (`big_five`, `questionnaire_answers`, `normalized_fields`, `story_conditioning`, `scan_fragments`, `curation_answers`) are `jsonb`. Status progresses `scanning → denoising → complete` (or stays at an earlier phase on abandonment).

Notable columns:
- `session_uuid` — the anonymous client UUID
- `scan_fragments` — array of `{id, text, final_status, chamber_index, pass_count}` for all 10 fragments after curate
- `user_rating` ∈ `like` / `dislike` / null, with `user_feedback` + `rated_at` for future-proofing

### `llm_calls` (append-only)

One row per provider request/response. `phase` ∈ `scan | structure | critique | sharpen | final | cleanup`, `step_index` disambiguates multi-step denoise. Each row has the user prompt, response text, model params, and latency.

## Write path

1. **Client mounts** → `getOrCreateSessionUuid()` → stored in React state (`app/page.tsx`).
2. **Scan starts** → `useGeneration.scanNoiseFragments()` POSTs `{type: "session-start"}` to `/api/telemetry` with full input state; receives the Postgres `sessionId`.
3. **Every LLM call** → `/api/generate` accepts `telemetry: {sessionId, phase, stepIndex}` in the request body and fire-and-forget inserts a `llm_calls` row after a successful provider response.
4. **User fires** → `useGeneration.generate()` POSTs `{type: "curate-complete"}` with the bullet array snapshot + curation answers + author voice.
5. **Cleanup finishes** → POSTs `{type: "story-complete"}` with the final trajectory.
6. **User clicks 👍 / 👎** → `StoryRating` POSTs `{type: "rate"}`; buttons lock into a confirmation state.

Telemetry helpers (`lib/telemetry.ts`) swallow all DB errors — a broken Supabase must never fail a generation. If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset, `getDb()` returns null and every helper is a no-op.

## Dev / prod

- **Dev**: `npm run db:start` boots a dockerized Postgres + Studio. `npm run db:reset` applies migrations. `.env.local.example` documents the local URL + where to paste the service-role key `supabase start` prints.
- **Prod**: Supabase-hosted project. Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in the deployment environment. `npm run db:push` promotes migrations.
- **Without env vars**: app works identically, nothing persisted. Same graceful-degradation pattern as `lib/rateLimit.ts`.

## Fine-tuning export

Pull the full dataset (one row per completed session, with its LLM calls aggregated) via:

```sql
select
  s.id,
  s.language,
  s.provider,
  s.model,
  s.guidance,
  s.denoise_steps,
  s.big_five,
  s.questionnaire_answers,
  s.normalized_fields,
  s.story_conditioning,
  s.scan_fragments,
  s.curation_answers,
  s.author_voice,
  s.final_story,
  s.user_rating,
  jsonb_agg(
    jsonb_build_object(
      'phase', c.phase,
      'step', c.step_index,
      'user_prompt', c.user_prompt,
      'response', c.response_text,
      'temperature', c.temperature,
      'max_tokens', c.max_tokens
    ) order by c.phase, c.step_index
  ) as llm_calls
from sessions s
join llm_calls c on c.session_id = s.id
where s.status = 'complete'
group by s.id;
```

Export to JSONL:

```bash
psql "$SUPABASE_DB_URL" -c "\copy (<query above>) to 'dataset.jsonl'"
```

Filter on `user_rating = 'like'` to build a preference dataset for DPO-style fine-tuning.

## Key files

- `lib/db.ts` — lazy Supabase client
- `lib/telemetry.ts` — `createSession`, `recordLlmCall`, `updateSessionCuration`, `completeSession`, `rateSession`
- `lib/sessionId.ts` — client-side UUID helper
- `app/api/telemetry/route.ts` — discriminated-union POST endpoint
- `app/api/generate/route.ts` — pipes each LLM call to `recordLlmCall`
- `hooks/useGeneration.ts` — lifecycle hook wiring
- `components/StoryRating.tsx` — thumbs-up / thumbs-down UI
- `supabase/migrations/20260420000000_initial_schema.sql` — DDL
