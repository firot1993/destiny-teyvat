# Destiny

Destiny is now a Teyvat adventure generator built with Next.js. A short seven-question editorial questionnaire seeds a randomized character reveal, then the app writes an open-ended scene-by-scene journey where the reader steers by choosing vague, evocative options.

## Experience Flow

1. Title screen, with a Bookshelf entry to revisit prior runs
2. Seven-question questionnaire — editorial (Mood / Desire / Conflict) for v1 and v2-tight, or wish-fulfillment (Origin / Power / Desire) for v2-wish
3. Either a character reveal card (single-reveal variants) **or** a fated-character reveal with three story directions to pick from (v2-wish), depending on the active variant
4. Scene loop with streamed prose, three choices, and an always-available “stop here” exit
5. Ending screen with replay and new-run actions; finished runs are archived into the Bookshelf, where they can be filtered by variant family

## Runtime Flow

- `app/page.tsx` is a **snap-scroll document**: a single `overflow-y: scroll; scroll-snap-type: y mandatory` container with one full-viewport stage per screen. All stages (title, questions, reveal, scenes, ending) are built into the document at once; `scrollToStageDelta(±1)` handles programmatic navigation. There is no phase-gated routing — the document grows as the adventure progresses.
- Stages use three visual tiers from `lib/teyvat/stageTiers.ts`: `atmospheric` (warm parchment — title and ending), `reading` (cream — questions and scenes), `theatrical` (deep ink — reveal). Each tier is palette-tinted by the active Vision element. Chapter context for each question lives in its eyebrow (e.g. `Mood · ii of vii`) — there are no dedicated chapter intro stages.
- `hooks/useAdventure.ts` exposes `currentStageIndex`, `answers`, `updateAnswer`, `commitReveal`, `enterWorld`, `pickDirection`, `chooseChoice` (with first-class branching), `switchToSibling`, `siblingsAt`, `takenChoicesAt`, `scrollToStageDelta`, and `docRef`.
- Scene state is a **tree** (`SceneTree`) — not a flat array. The active path is `SceneTree.activePath`; `activeScenesOf(state)` returns it as an ordered array. Choosing a new option on a past scene forks a sibling branch; choosing an existing option switches to it without an LLM call. Arrow keys and a pager navigate between siblings.
- The **reveal is the commit gate**: questionnaire answers are mutable until `commitReveal()` is called. Once committed, the seal is permanent and `isCommitted` drives the `sealed` prop on each question stage.
- For single-reveal variants (v1, v2-tight), reveal generation is one non-streaming JSON call built by `buildRevealPrompt(...)` and parsed by `parseReveal(...)`.
- For the v2-wish variant, `pickFatedCharacter(...)` deterministically picks the single highest-scoring canon character from `CANON_ROSTER` for the reader's answers, then `buildFatedRevealPrompt(...)` makes one non-streaming JSON call that returns a "why this character" line plus three distinct story directions. The user picks one direction; that direction's title and hook are persisted on the adventure and threaded into every scene prompt as a story-arc anchor.
- After a reveal, the hook fires a best-effort `/api/imagine` call (xAI Imagine) to render a Genshin-style character portrait shown in `RevealStage`. Image generation never blocks the flow.
- Scene generation is one streamed-or-fallback call per scene built by `buildScenePrompt(...)` and parsed by `parseSceneStream(...)`.
- The scene prompt includes a pacing matrix that pushes toward closure by scene 5-7, with a hard cap at scene 10.
- A prompt switch system (`lib/teyvat/promptVariants.ts` + `lib/teyvat/promptSwitch.ts`) drives A/B testing and frontend debugging: each call dispatches through a named variant — `v1` (editorial baseline), `v2-tight` (concise alternate), `v2-wish` (wish-fulfillment / 爽文, opt-in only) — picked by `?promptVariant=<id>` → `localStorage` → weighted-random sticky assignment.
- Back-nav with answer-hash caching: resubmitting the same questionnaire answers restores the cached reveal/fated pick without an LLM call. Caches live in `destiny-last-{answers,reveal,fated}` and are wiped by `startOver`.
- Provider retries, fallback providers, daily quota headers, per-IP throttling, and optional telemetry remain in the shared runtime.

## Architecture

```text
app/page.tsx  (snap-scroll document)
  ├─ components/teyvat/stages/TitleStage.tsx
  ├─ components/teyvat/stages/QuestionStage.tsx
  ├─ components/teyvat/stages/RevealStage.tsx
  ├─ components/teyvat/stages/SceneStage.tsx
  │    └─ components/teyvat/BranchPager.tsx
  ├─ components/teyvat/stages/EndingStage.tsx
  └─ components/teyvat/Bookshelf.tsx

hooks/useAdventure.ts
  ├─ lib/teyvat/questionnaire.ts
  ├─ lib/teyvat/questionnaires/{editorialQuestionnaire,wishQuestionnaire}.ts
  ├─ lib/teyvat/prompts.ts
  ├─ lib/teyvat/candidates.ts
  ├─ lib/teyvat/canonRoster.ts
  ├─ lib/teyvat/character.ts
  ├─ lib/teyvat/scenes.ts
  ├─ lib/teyvat/elements.ts
  ├─ lib/teyvat/storage.ts
  └─ lib/teyvat/theme.ts

app/api/generate/route.ts
  ├─ lib/providers.ts
  ├─ lib/rateLimit.ts
  └─ lib/telemetry.ts

app/api/imagine/route.ts
  └─ lib/rateLimit.ts
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

- `app/page.tsx` — snap-scroll document: builds all stages; contains the HUD (lang toggle + gear settings icon), Bookshelf overlay, and quota badge
- `app/api/generate/route.ts` — provider proxy, rate limiting, daily quotas, and streaming pass-through
- `app/api/imagine/route.ts` — xAI image proxy for the reveal-stage character portrait
- `app/api/telemetry/route.ts` — optional best-effort session/story telemetry
- `hooks/useAdventure.ts` — reveal, portrait, scene, branching, and library runtime; exposes `currentStageIndex`, `chooseChoice`, `siblingsAt`, `takenChoicesAt`, `switchToSibling`
- `lib/teyvat/stageTiers.ts` — three visual tiers (`atmospheric`, `reading`, `theatrical`) and per-Vision palette tokens
- `lib/teyvat/scenes.ts` — scene/adventure types; `SceneTree`, `SceneNode`, `activeScenesOf`, `forkAt`, `switchSibling`
- `lib/teyvat/questionnaire.ts` — `QuestionnaireSchema` type and editorial-schema re-exports
- `lib/teyvat/prompts.ts` — public reveal/scene builders and parsers (dispatches by variant id)
- `lib/teyvat/promptVariants.ts` — prompt variant registry (`v1` baseline, `v2-tight` alternate, `v2-wish` wish-fulfillment)
- `lib/teyvat/promptSwitch.ts` — variant resolver and debug picker hooks (URL / localStorage / weighted-random)
- `lib/teyvat/character.ts` — reveal types and validation
- `lib/teyvat/storage.ts` — localStorage persistence for in-progress adventures and the Bookshelf library archive
- `lib/teyvat/canonRoster.ts` — canonical Genshin character roster (~25 entries) used by v2-wish as the fated-character pool
- `lib/teyvat/candidates.ts` — v2-wish prefilter, deterministic top-1 picker (`pickFatedCharacter`), fated-reveal prompt builder, and response parser (returns `{ why, directions[3] }`)
- `lib/teyvat/elements.ts` — Vision/nation/weapon enums and element palettes
- `lib/teyvat/theme.ts` — parchment theme tokens and per-Vision tinting
- `components/teyvat/stages/` — all snap-scroll stage components (TitleStage, QuestionStage, RevealStage, SceneStage, EndingStage, StageWrapper)
- `components/teyvat/BranchPager.tsx` — sibling-branch pager shown above a scene when branches ≥ 2
- `components/teyvat/Bookshelf.tsx` — archived-runs overlay
- `i18n/index.tsx` — English and Simplified Chinese copy

## Persistence And Telemetry

- In-progress adventures are saved to `localStorage` so a refresh can resume from the current reveal or scene state.
- Completed (or user-stopped) adventures are archived into a separate Bookshelf library in `localStorage` and can be revisited from the title screen.
- `lib/db.ts` and `lib/telemetry.ts` remain best-effort: when Supabase is unset, they silently no-op.
- `/api/generate` can still record LLM calls when telemetry is configured.

## Rate Limiting And Providers

- `/api/generate` keeps per-IP throttling plus a global daily cap.
- `/api/imagine` reuses the same per-IP rate limiter and returns 503 when `XAI_API_KEY` is unset.
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