# v2-wish Prompt Variant — Design

**Date:** 2026-05-07
**Status:** Design approved, ready for implementation plan
**Topic:** Add a wish-fulfillment (爽文) prompt variant that lets users pick from a small list of canonical Genshin characters and play out a transmigration power-fantasy run.

## Goal

Add a third prompt variant, `v2-wish`, alongside the existing `v1` (editorial baseline) and `v2-tight` (concise alternate). Unlike the existing variants, `v2-wish` does not generate an original character. Instead it:

1. Asks the user a different set of seven questions tuned for power-fantasy axes.
2. Suggests 3-5 canonical Genshin characters from a code-side roster.
3. Lets the user pick one.
4. Drops them into a scene-by-scene 转生成为X然后天下无敌-style story, opening with the awakening moment.

Reference frame: the kind of run produced by Chinese web-novels like *转生成为雷电将军，然后天下无敌* — the user knows exactly which canonical character they are, the mechanical fantasy is dominance, and the appeal is escalation.

## Non-goals

- We do **not** generate canonical character bios. The user already knows who Raiden Shogun / Zhongli / Hu Tao are. Re-explaining canon is wasted text.
- We do **not** add a new top-level page or a separate user flow. v2-wish lives inside the existing prompt-variant system, sharing providers, quotas, telemetry, settings, and the Bookshelf.
- We do **not** restructure v1 / v2-tight content. Their questionnaires and reveal contracts must continue to behave identically after this change.
- We do **not** pre-author per-character story content. The roster is structured metadata only; all narrative comes from the model.

## High-level approach

Generalize the prompt-variant system so each variant can declare *what shape it uses* — which questionnaire, what kind of reveal (single character vs. candidates), what framing, what scene tone. The existing two variants share a `single`-reveal capability with the editorial questionnaire; the new `v2-wish` variant declares a `candidates`-reveal capability with its own questionnaire.

The core runtime gains one new state — `candidate-pick` — only entered when the active variant uses `candidates` reveal. Everything else (provider routing, scene loop, archive, Bookshelf) continues to work unchanged.

## Variant capabilities

Each entry in `PROMPT_VARIANTS` (defined in `lib/teyvat/promptVariants.ts`) gains a `capabilities` block:

```ts
interface PromptVariantCapabilities {
  questionnaire: QuestionnaireSchema;
  reveal: RevealContract;
  framing: 'protagonist-or-companion' | 'transmigration';
  sceneTone: 'editorial' | 'wish-fulfillment';
}

type RevealContract =
  | { kind: 'single' }
  | { kind: 'candidates'; min: number; max: number };
```

`QuestionnaireSchema` becomes a first-class type. The current single hard-coded questionnaire in `lib/teyvat/questionnaire.ts` becomes the editorial schema (consumed by `v1` and `v2-tight`). The new wish schema (consumed by `v2-wish`) lives alongside it.

`Questionnaire.tsx` already takes the schema as data — it stops importing the singleton and accepts a `schema` prop instead. The hook passes the schema for the active variant.

`useAdventure.ts` reads `capabilities.reveal.kind` after `submitQuestionnaire(...)` to choose the path:

- `single` → existing path: `buildRevealPrompt(...)` → `parseReveal(...)` → `reveal-shown` → user clicks "Enter the world" → `scene-generating`.
- `candidates` → new path: `buildCandidatesPrompt(...)` → `parseCandidates(...)` → state holds a candidates list → `candidate-pick` phase → user picks one → resolve into a `RevealedCharacter` from the roster → `scene-generating` (no separate reveal-card view).

## File layout

```
lib/teyvat/
  questionnaire.ts                       # re-exports both schemas; backwards-compat surface
  questionnaires/
    editorialQuestionnaire.ts            # current 7-question schema (Mood / Desire / Conflict)
    wishQuestionnaire.ts                 # new 7-question schema (出身 / 力量 / 渴望)
  canonRoster.ts                         # ~20-30 CanonCharacter entries with power-fantasy tags
  canonNames.ts                          # unchanged — collision rejection for v1
  prompts.ts                             # adds buildCandidatesPrompt + parseCandidates
  promptVariants.ts                      # registry gains capabilities; adds v2-wish entry

components/teyvat/
  Questionnaire.tsx                      # accepts schema as a prop instead of importing singleton
  CandidateGallery.tsx                   # new — renders 3-5 candidate cards, handles pick
  Bookshelf.tsx                          # adds variant-family filter chips to each tab

hooks/
  useAdventure.ts                        # adds candidates-generating + candidate-pick phases

app/page.tsx                             # routes the new phases to CandidateGallery
i18n/index.tsx                           # adds copy for wish questionnaire chapters and CandidateGallery
```

## The v2-wish questionnaire

Seven single-select questions across three chapters. Same `TeyvatAnswers` shape (`stepId -> option.value`) as the editorial questionnaire so storage and prompt-builder contracts are unchanged.

**Chapter 1 — 出身 (Origin)** — the modern self before transmigration

1. **escape**: What pulled you toward another world? — *burnout / heartbreak / boredom / injustice*
2. **denied**: What did the old world refuse you? — *respect / power / love / freedom*

**Chapter 2 — 力量 (Power)** — how dominance feels

3. **dominance**: What kind of overwhelming feels best? — *martial / political / intellectual / divine*
4. **pace**: How fast should the rise be? — *instant god-mode / earned escalation / patient strategist*

**Chapter 3 — 渴望 (Desire)** — what victory looks like

5. **humble**: Who most deserves to be humbled? — *those who scorned you / a rival faction / the heavens themselves / no one — just live well*
6. **reward**: What reward is worth fighting for? — *recognition / companions and bonds / wealth and territory / transcendence*
7. **affinity**: What aesthetic calls to you? — *thunder and steel / stone and gold / flame and fragrance / frost and silence / wind and song / water and starlight / dendro and verse* — soft hint to the candidate selector, not a hard filter

The 7th question maps loosely to the seven Visions but is intentionally non-binding — it weights the candidate filter, never excludes characters outright.

Both English and Simplified Chinese copy lives in `i18n/index.tsx` matching the v1 pattern.

## Canon roster

A new file `lib/teyvat/canonRoster.ts` defines the source pool for candidate selection. Roster scope is **20-30 characters** for the first cut — representative coverage of the seven Visions and the four playable nations, weighted toward characters with diverse power-fantasy archetypes (rulers, prodigies, exiles, schemers, warriors, sages).

```ts
interface CanonCharacter {
  id: string;                        // "raiden-shogun"
  nameEn: string;                    // "Raiden Shogun"
  nameZh: string;                    // "雷电将军"
  vision: Vision;                    // "Electro"
  nation: Nation;                    // "Inazuma"
  weapon: Weapon;                    // "Polearm"
  archetypeTags: string[];           // ["divine", "martial", "ruler", "isolated"]
  archetypeBlurb: { en: string; zh: string };  // one-line, used as RevealedCharacter.archetype
  bioBlurb: { en: string; zh: string };        // 2-3 sentences, used as RevealedCharacter.bio
  powerFantasyAxes: {
    dominance: ('martial' | 'political' | 'intellectual' | 'divine')[];
    pace: ('instant' | 'earned' | 'patient')[];
    humbleTargets: ('scorners' | 'rival-faction' | 'heavens' | 'live-well')[];
    rewards: ('recognition' | 'companions' | 'wealth' | 'transcendence')[];
  };
}
```

The roster is a static, hand-curated list. No model involvement in roster definition.

`canonNames.ts` is left untouched — it still serves v1's collision rejection for original-character generation.

## Candidate selection

For v2-wish, the reveal step is a **candidate-suggestion** call instead of a full character-generation call.

### Step 1: pre-filter (in code, no model cost)

Before the LLM call, narrow the roster from ~30 → ~8-10 by tag overlap with the user's answers. The pre-filter scores each canon character on:

- match count between the user's `dominance` answer and the character's `powerFantasyAxes.dominance`
- match count for `pace`, `humble`, `reward`
- soft bonus for `affinity` matching the character's vision

Top ~8-10 by score advance to the LLM. Ties broken by archetype diversity (avoid sending five Inazuma swordsmen). The pre-filter is deterministic given the same answers.

### Step 2: LLM picks 3-5 + writes hooks

`buildCandidatesPrompt(answers, prefilteredRoster, language, variantId)` produces a prompt that tells the model:

- The user's answers (in plain language)
- The pre-filtered roster (id + name + a few canonical anchors per character)
- Pick 3-5 of these whose archetype best fits the user's answers
- For each pick, write a 2-3 sentence transmigration **opening hook** in 爽文 tone, in the answer language, describing the awakening moment (waking *as* this character with their memories and powers)

Output schema:

```json
{
  "candidates": [
    {
      "id": "raiden-shogun",
      "hook": "你在天守阁顶层睁开眼。雷光在指尖低吼，将军的记忆如潮水般涌入..."
    },
    {
      "id": "zhongli",
      "hook": "..."
    }
  ]
}
```

### Step 3: parseCandidates

`parseCandidates(raw, expectedRoster)` validates that:

- Output is valid JSON.
- `candidates` is an array of length 3-5.
- Every `id` exists in the pre-filtered roster (rejects hallucinated names).
- Every `hook` is non-empty and reasonably bounded.

On failure, one corrective retry is performed (same pattern as `parseReveal`).

## State machine + UI

### New phases

The existing state machine gains two phases:

- `candidates-generating` — between `questionnaire` and `candidate-pick`, while the candidates call is in flight.
- `candidate-pick` — the user is looking at the gallery of suggested characters.

Full machine after the change:

```
idle
  → bookshelf (existing, returns to idle)
  → questionnaire
  → revealing (single-character variants)
      → reveal-shown → scene-generating → scene-shown → ended
  → candidates-generating (candidates variants)
      → candidate-pick → scene-generating → scene-shown → ended
```

The `reveal-shown` phase is **skipped entirely** for candidates variants. The candidate hook *is* the reveal moment, and the scene opens directly with the awakening — re-rendering a separate reveal card would be redundant.

### `CandidateGallery.tsx`

New component in `components/teyvat/`. Props:

```ts
interface CandidateGalleryProps {
  candidates: CandidateOption[];
  language: Language;
  onPick: (id: string) => void;
}

interface CandidateOption {
  character: CanonCharacter;     // resolved from roster by id
  hook: string;                  // the model-generated transmigration opening
  imageUrl?: string | null;      // best-effort, set after async portrait load
}
```

Layout: 3-5 cards in a responsive grid. Each card shows:

- Canonical name (in answer language)
- Vision glyph tinted with the existing `theme.ts` per-Vision colors
- Nation tag + weapon icon
- The 2-3 sentence hook (the differentiator — this is what the user actually reads)
- Portrait area (optional, `/api/imagine` best-effort)

Portrait generation: when `candidates-generating` resolves, `useAdventure.ts` fires one `/api/imagine` call per candidate (≤5 in flight), updating each card's `imageUrl` as images arrive. Cards render and are clickable immediately — image arrival is purely visual polish. Per-IP rate limit headroom: 5 image calls per run is acceptable given the existing limiter.

User clicks a card → `onPick(id)` → hook calls `pickCandidate(id, language)` → scene generation begins.

### `pickCandidate(id, language)`

New method on `useAdventure.ts`. Looks up the canonical character from the roster by `id`, builds a `RevealedCharacter` with:

- `name`, `vision`, `nation`, `weapon` from the roster entry
- `framing: 'protagonist'` (transmigration is always first-person)
- `archetype` and `bio` filled from `archetypeBlurb` and `bioBlurb` fields on the roster entry (authored once per canon character when the roster is defined; used by the Bookshelf and scene-prompt context)
- The chosen hook stored on `RevealedCharacter` as a new `awakeningHook?: string` field. The v2-wish scene-prompt builder reads this field as the scene-1 anchor; the editorial variants ignore it.

Then transitions to `scene-generating` and runs the existing scene loop with v2-wish's scene tone.

## Scene tone (wish-fulfillment)

`buildScenePrompt(...)` continues to dispatch through the variant registry. The v2-wish scene builder:

- Uses **transmigration framing**: the character has just awakened with the canonical character's powers and memories intact; the modern self is now them.
- For scene 1, anchors the opening on the chosen hook (the one the user picked) and resolves it into a full first scene.
- Uses **爽文 escalation language**: overwhelming victories, narrative validation, system-message-adjacent beats where natural, dominance shown not told.
- Uses the **same pacing matrix and 10-scene cap** as v1/v2-tight — the variant changes tone, not structure.
- Uses the **same `<scene>/<choices>/<closing>/<summary>` tag contract** — the parser is shared.

The choices the model offers should reflect the variant's tone (dominance, declaration, expansion) but the choice mechanic is unchanged.

## Storage and Bookshelf

### `AdventureState` change

`AdventureState` gains an optional `variantId?: string` field. It's set when the adventure is created (in both `submitQuestionnaire` for single-reveal variants and `pickCandidate` for candidates variants) and persisted through `saveAdventure(...)` and `archiveToLibrary(...)`. Legacy runs without `variantId` continue to load — they're treated as variant family "Editorial" by the Bookshelf filter.

`RevealedCharacter` gains an optional `awakeningHook?: string` field, set only by `pickCandidate` for candidates variants. Editorial variants leave it undefined. The field persists through storage and is the data path the v2-wish scene-prompt builder reads to anchor scene 1.

### Bookshelf separation

`Bookshelf.tsx` adds a small variant-family filter chip row at the top of each tab. Default selection is **All**. The filter mapping (encapsulated in a single helper):

- `v1`, `v2-tight`, undefined (legacy) → "Editorial"
- `v2-wish` → "Wish-fulfillment"
- unknown variant id → "Other"

The mapping lives in `lib/teyvat/promptVariants.ts` next to the registry so adding a new variant means updating one place.

The two existing tabs (`stories` / `characters`) are unchanged — the chip row filters within whichever tab is active.

## Settings panel

`app/page.tsx` already reads available variants from `listPromptVariants()`. v2-wish appears in the picker automatically once registered. No additional UI work in the settings panel.

## Provider, quota, telemetry

Unchanged. v2-wish uses the same `/api/generate` route, the same fallback chain, and the same telemetry. Image generation for candidate portraits uses the existing `/api/imagine` route. Per-IP rate limiting and daily quota enforcement apply to all calls.

## Test plan

- **Unit**: `parseCandidates` accepts a valid response, rejects hallucinated ids, rejects out-of-range list lengths, accepts the corrective-retry path.
- **Unit**: pre-filter is deterministic given the same answers, returns the expected ~8-10 size, doesn't drop diversity-required entries.
- **Unit**: roster lookup by id resolves correctly; missing id surfaces as a user-facing error rather than a silent failure.
- **Unit**: `Questionnaire.tsx` renders the wish schema correctly when given the wish schema as a prop, and continues to render the editorial schema correctly.
- **Integration**: existing v1 and v2-tight integration tests continue to pass without modification (this is the primary regression guard).
- **Integration**: full v2-wish run from questionnaire → candidates → pick → scene 1 → ending, asserting the awakening anchor appears in scene 1.
- **Storage**: legacy runs (no `variantId`) load and appear in the Editorial filter; v2-wish runs appear in the Wish-fulfillment filter; switching tabs preserves the active filter.

## Open questions / risks

- **Canon roster coverage**: 20-30 characters means some popular characters will be omitted in the first cut. The roster is authored, not generated, so expanding it later is a code change, not a model change. Acceptable.
- **Pre-filter quality**: tag-overlap scoring is heuristic. If the user's answers are highly unusual (e.g. all questions answered at extreme ends), pre-filter might surface a thin set. Mitigation: enforce a minimum candidate count (e.g. always advance at least 6 to the LLM, padding by archetype diversity if scores are sparse).
- **Hook quality is the entire UX**: since the user picks based on the hook, hook quality dominates the variant's perceived quality. Worth iterating on the prompt wording during implementation.
- **Image generation cost**: up to 5 concurrent `/api/imagine` calls per run is a step up from v1's single call. The first cut commits to N-up-front (one per candidate) since the gallery's whole job is to help the user pick. If this becomes a quota or cost concern in practice, the cheapest mitigation is to drop to single-on-pick — but that's a follow-up, not part of this spec.

## Out of scope

- Per-character pre-authored story openings.
- Roster expansion beyond ~20-30.
- Different scene-loop structure for v2-wish (different MAX_SCENES, different choice count, etc.).
- Telemetry on which candidate was picked (could be added later by reading `variantId` and resolved character from the existing telemetry payload).
