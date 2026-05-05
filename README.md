# Destiny

Destiny is now a Teyvat adventure generator built with Next.js. A short seven-question editorial questionnaire seeds a randomized character reveal, then the app writes an open-ended scene-by-scene journey where the reader steers by choosing vague, evocative options.

## Experience Flow

1. Title screen
2. Seven-question Teyvat questionnaire across Mood, Desire, and Conflict
3. Character reveal card with Vision, nation, weapon, archetype, constellation, and a Vision-acquisition vignette
4. Scene loop with streamed prose, three choices, and an always-available “stop here” exit
5. Ending screen with replay and new-run actions

## Runtime Flow

- `app/page.tsx` renders the full client flow: title -> questionnaire -> reveal -> scene loop -> ending.
- `hooks/useAdventure.ts` owns the state machine: `idle -> questionnaire -> revealing -> reveal-shown -> scene-generating -> scene-shown -> ended`.
- Reveal generation is one non-streaming JSON call built by `buildRevealPrompt(...)` and parsed by `parseReveal(...)`.
- Scene generation is one streamed-or-fallback call per scene built by `buildScenePrompt(...)` and parsed by `parseSceneStream(...)`.
- The scene prompt includes a pacing matrix that pushes toward closure by scene 5-7, with a hard cap at scene 10.
- Provider retries, fallback providers, daily quota headers, per-IP throttling, and optional telemetry remain in the shared runtime.

## Architecture

```text
app/page.tsx
  ├─ components/teyvat/TitleScreen.tsx
  ├─ components/teyvat/Questionnaire.tsx
  ├─ components/teyvat/RevealCard.tsx
  ├─ components/teyvat/SceneView.tsx
  ├─ components/teyvat/AdventureLog.tsx
  └─ components/teyvat/Ending.tsx

hooks/useAdventure.ts
  ├─ lib/teyvat/questionnaire.ts
  ├─ lib/teyvat/prompts.ts
  ├─ lib/teyvat/character.ts
  ├─ lib/teyvat/scenes.ts
  ├─ lib/teyvat/elements.ts
  ├─ lib/teyvat/storage.ts
  └─ lib/teyvat/theme.ts

app/api/generate/route.ts
  ├─ lib/providers.ts
  ├─ lib/rateLimit.ts
  └─ lib/telemetry.ts
```

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
OPENROUTER_API_KEY=        # required for the default provider path
DEEPSEEK_API_KEY=          # optional, enables DeepSeek models in the UI
XAI_API_KEY=               # optional, enables xAI models in the UI
ANTHROPIC_API_KEY=         # optional, supported by the route adapter
GOOGLE_API_KEY=            # optional, supported by the route adapter
SITE_URL=                  # optional, used as OpenRouter HTTP-Referer

UPSTASH_REDIS_REST_URL=    # optional, enables rate limiting
UPSTASH_REDIS_REST_TOKEN=  # optional
MAX_REQUESTS_PER_DAY=1000  # optional, defaults to 1000

SUPABASE_URL=              # optional, enables telemetry/persistence
SUPABASE_SERVICE_ROLE_KEY= # optional

NEXT_PUBLIC_FALLBACK_PROVIDERS=  # optional, comma-separated fallback provider chain
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch

npm run redteam:generate
npm run redteam:run

npm run db:start
npm run db:reset
npm run db:push
npm run db:stop
```

## Key Files

- `app/page.tsx` — top-level flow and settings UI
- `app/api/generate/route.ts` — provider proxy, rate limiting, daily quotas, and streaming pass-through
- `app/api/telemetry/route.ts` — optional best-effort session/story telemetry
- `hooks/useAdventure.ts` — reveal + scene runtime state machine
- `lib/teyvat/questionnaire.ts` — seven-question staged questionnaire schema
- `lib/teyvat/prompts.ts` — reveal/scene prompt builders and parsers
- `lib/teyvat/character.ts` — reveal types and validation
- `lib/teyvat/scenes.ts` — scene/adventure types
- `lib/teyvat/storage.ts` — localStorage persistence for in-progress adventures
- `lib/teyvat/elements.ts` — Vision/nation/weapon enums and element palettes
- `lib/teyvat/theme.ts` — parchment theme tokens and per-Vision tinting
- `components/teyvat/*` — title, questionnaire, reveal, scene, log, and ending components
- `i18n/index.tsx` — English and Simplified Chinese copy

## Persistence And Telemetry

- In-progress adventures are saved to `localStorage` so a refresh can resume from the current reveal or scene state.
- `lib/db.ts` and `lib/telemetry.ts` remain best-effort: when Supabase is unset, they silently no-op.
- `/api/generate` can still record LLM calls when telemetry is configured.

## Rate Limiting And Providers

- `/api/generate` keeps per-IP throttling plus a global daily cap.
- `callProvider(...)` retries retryable upstream failures with exponential backoff.
- `callProviderWithFallbacks(...)` falls through to `NEXT_PUBLIC_FALLBACK_PROVIDERS` when configured.
- Streaming support remains available for OpenAI-compatible upstreams through the shared provider layer.

## Tech Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Framer Motion
- Upstash Redis for optional rate limiting
- Supabase/Postgres for optional telemetry persistence
- Vitest + React Testing Library