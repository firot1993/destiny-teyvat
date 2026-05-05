# Repo Logic And Prompt Flow

This note explains the repo at the product-logic level rather than the UI level.

The current system is:

1. A staged questionnaire that collects factual guardrails plus dramatic tension
2. A scan pass that generates 10 unresolved future fragments
3. A user-curated bullet phase that chooses visible story motifs
4. A hidden conditioning layer that compresses questionnaire data into latent forces
5. A structure step that drafts scenes from selected motifs
6. A critique step that identifies what's weak in the draft
7. A sharpen step that expands and revises using critique notes
8. A final step that produces a 4-paragraph story with signature author voice
9. A cleanup pass that strips questionnaire-sounding prose and enforces texture

The app still borrows the language of "diffusion," but the runtime is not a true diffusion model. It is a prompt chain with one human curation checkpoint and one final cleanup rewrite.

## Source Map

The logic described here comes primarily from these files:

- `lib/questionnaire.ts`
- `components/InputForm.tsx`
- `components/Big5Form.tsx`
- `app/page.tsx`
- `lib/prompts.ts`
- `hooks/useGeneration.ts`
- `lib/revolver.ts`
- `lib/styles.ts`
- `app/api/generate/route.ts`
- `lib/providers.ts`
- `types/index.ts`

The key data shapes discussed below are:

- `QuestionnaireAnswers`
- `Fields`
- `CurationAnswers`
- `StoryConditioning`
- `NoiseFragment`
- `Bullet`
- `RunPhase`

The key prompt entry point is now:

```ts
generateStepPrompt(step, totalSteps, conditioning, guidance, prev, lang, orderedBullets?, critiqueNotes?, signatureAuthor?)
```

Additional prompt constructors:

- `generateCritiquePrompt(draft, conditioning, lang)` — critique after structure step
- `generateCleanupPrompt(trajectory, lang)` — final anti-echo pass

## Product Thesis

The redesign changed the product goal from:

> "describe yourself, then narrativize the description"

to:

> "reveal your tensions, then turn those tensions into a future shape"

That produces three important separations:

- questionnaire answers define causality, boundary conditions, and plausibility
- selected bullets define imagery, scenes, motifs, and memorable turns
- the final cleanup pass removes direct profile paraphrase if it leaks back in

## What The App Asks

### Base questionnaire

The questionnaire still begins from a shared base shape assembled by `getBaseSteps(...)` in `lib/questionnaire.ts`.

The fixed inputs are:

- `age`
- `mobility`
- `currentMode`
- `skills`
- `resources`
- `constraints`
- `obsessions`
- `workStyle`
- `riskTolerance`
- `timeHorizon`

These are still curated option pools, not free text.

What changed is the user-facing copy:

- `resources` now asks for hidden asymmetry rather than inventory
- `constraints` now asks for repeating traps rather than static problems
- `workStyle` now asks how momentum usually arrives
- `riskTolerance` now asks which error the person fears more
- `trajectoryFocus` now asks what makes the chapter unstable in an interesting way
- `inflection` now asks what kind of event would force the next version of the person to appear

The backend schema did not get rebuilt. The canonical `value` strings still drive routing and normalization. The `label` strings got rewritten to feel more dramatic and less profile-like.

### Dynamic question: `trajectoryFocus`

`trajectoryFocus` is still conditional. It is inserted by `getQuestionnaireSteps(...)` when the app can infer a route-specific tension from:

- age group
- `currentMode`

The logic is unchanged:

- derive `ageGroup` from `age`
- select route options from `YOUTH_ROUTE_OPTION_MAP` or `ADULT_ROUTE_OPTION_MAP`
- append age-specific route bonuses from `AGE_ROUTE_BONUS`
- insert the step after the first three questions when at least one route option exists

What changed is the framing. The prompt copy is now tension-first:

- title: `What makes this chapter unstable in an interesting way?`
- description: choose the contradiction that gives the chapter its charge

So the logic is still route-conditioned, but the experience feels less like a career form and more like a pressure-reading instrument.

### Dynamic question: `inflection`

`inflection` is still appended only if `getInflectionTension(riskTolerance, workStyle)` returns a non-null value.

The four tension groups are unchanged:

- `bold-craft`
- `cautious-visible`
- `speed-system`
- `generic`

The routing still keys off canonical values such as:

- quiet craft plus bold risk -> `bold-craft`
- visibility plus conservative risk -> `cautious-visible`
- systems plus speed-oriented risk -> `speed-system`
- all other valid pairs -> `generic`

What changed is the wording. The step now asks for a rupture rather than a nice milestone:

- title: `What kind of event would force the next version of you to appear?`
- description: choose the rupture that makes hedging harder than becoming

### Skill-based option expansion

The questionnaire still expands `resources` and `constraints` based on selected `skills`.

This still happens in:

- `getQuestionnaireSteps(...)`
- `normalizeQuestionnaireAnswers(...)`

Examples:

- `Tech & Engineering` adds `Open-source reputation` and `Automation anxiety — my own tools could replace me`
- `Writing & Media` adds `An audience that trusts my voice` and `Algorithms decide who hears me`

So the app still adapts what counts as a plausible asset or bottleneck based on domain context.

## Inputs Outside The Questionnaire

There are now two separate non-questionnaire input layers.

### Big Five sliders

`components/Big5Form.tsx` still collects five 1-10 scores keyed from `BIG5_KEYS`:

- openness
- conscientiousness
- extraversion
- agreeableness
- neuroticism

The important redesign change is that the prompt layer no longer sends these as named Big Five traits with explicit "high openness means X" instructions.

Instead, `buildStoryConditioning(...)` in `lib/prompts.ts` converts them into a behavioral signature:

- `noveltyAppetite`
- `consistencyPressure`
- `socialPropulsion`
- `conflictTolerance`
- `anticipatorySensitivity`
- `combinedReading`

Examples of the tone of this conversion:

- "moves toward novelty before full permission exists"
- "builds slowly, privately, and convincingly"
- "feels the future intensely enough that doubt and drive keep taking turns at the wheel"

So personality is now encoded as causal behavior, not diagnostic labels.

### Post-curation answers

After bullet selection, the user now supplies two more signals in `app/page.tsx`:

```ts
type CurationAnswers = {
  whyThese: string;
  rejectedFuture: string;
};
```

These are not part of `QuestionnaireAnswers`.

They are collected after the scan/bullet phase using fixed option sets:

- `whyThese`
  - "They feel like my best life"
  - "They feel dangerous but true"
  - "They feel embarrassing to want"
  - "They feel more real than the rest"
  - "I don't know why, but they stick"
- `rejectedFuture`
  - "too safe"
  - "too performative"
  - "too lonely"
  - "too chaotic"
  - "too ordinary"
  - "too borrowed from other people"

These are not visible motifs either. They only shape hidden conditioning.

## Controls

The app still also collects:

- `guidance`
- `denoiseSteps`
- `provider`
- `model`

### Guidance

`guidance` is still the ambition/intensity dial.

It affects:

- scan tone
- denoise ambition framing

The buckets remain:

- high: dramatic pivots, unexpected breakthroughs, biography-worthy
- middle: ambitious but grounded, notable achievements
- low: meaningful, well-lived, not flashy

### Denoise steps

`denoiseSteps` still ranges from 2 to 8.

The runtime call structure is now:

- 1 scan call
- `denoiseSteps - 1` denoise calls (includes structure, critique, sharpen, and final)
- 1 critique call (after the structure step)
- 1 cleanup call

So the total model-call count is:

```text
denoiseSteps + 2
```

Examples:

- `denoiseSteps = 2` -> 1 scan + 1 final denoise + 1 cleanup = 3 (no structure step, so no critique)
- `denoiseSteps = 4` -> 1 scan + 1 structure + 1 critique + 1 sharpen + 1 final + 1 cleanup = 6

The prompt templates and `maxTokens` vary by step:

| Step type | Template | maxTokens | Temperature |
|-----------|----------|-----------|-------------|
| scan | scan | 1000 | 1.15 |
| structure | early structure (progress < 0.45) | 1000 | 1.05 |
| critique | critique prompt | 800 | 0.7 |
| sharpen | sharpen/revise (progress >= 0.45, not final) | 1800 | 1.05 |
| final | final trajectory | 3000 | 1.05 |
| cleanup | cleanup | 3000 | 0.8 |

The higher `maxTokens` for final and cleanup steps accommodates the new 4-paragraph, 400-600 word output format and CJK tokenization density.

### Provider and model

This logic is unchanged:

- `provider` chooses the upstream adapter in `lib/providers.ts`
- `model` chooses the concrete model name sent to that provider

The prompt chain itself does not vary by provider.

## Normalization And Encoding

### `QuestionnaireAnswers` -> normalized answers

`normalizeQuestionnaireAnswers(...)` still makes questionnaire state self-healing.

It:

1. Re-derives valid steps from `age`
2. Rebuilds route-conditioned and skill-conditioned option pools
3. Filters selected values against the currently valid option set
4. Truncates single-choice steps to one value
5. Truncates multi-choice steps to `maxSelect`
6. Re-validates `trajectoryFocus`
7. Keeps at most one `inflection` answer

So earlier answer changes still invalidate downstream choices automatically.

### Normalized answers -> `Fields`

`buildFieldsFromAnswers(...)` still flattens normalized answers into `Fields`.

Important details:

- `location` is still copied from `mobility`
- single-choice fields stay scalar
- multi-select fields are still joined into comma-separated strings:
  - `skills`
  - `resources`
  - `constraints`
  - `obsessions`

This flattened shape still exists because the hook and conditioning builder consume one normalized object, not raw UI arrays.

### `Fields` + Big Five + curation -> `StoryConditioning`

This is the biggest architectural change.

The old `buildStateString(...)` no longer exists. The interview layer no longer emits one prompt-visible profile paragraph.

Instead, `buildStoryConditioning(...)` returns:

```ts
type StoryConditioning = {
  hardState: {
    ageBand: string;
    mobility: string;
    chapter: string;
    horizon: string;
    anchorResource?: string;
    anchorConstraint?: string;
    secondaryConstraint?: string;
  };
  latentForces: {
    coreTension: string;
    momentumPattern: string;
    exposurePattern: string;
    riskPattern: string;
    identityPressure: string;
    likelyTransformation: string;
    selectionCharge?: string;
    rejectedGravity?: string;
  };
  personalitySignature: {
    noveltyAppetite: string;
    consistencyPressure: string;
    socialPropulsion: string;
    conflictTolerance: string;
    anticipatorySensitivity: string;
    combinedReading: string;
  };
};
```

This object is built heuristically in `lib/prompts.ts`.

Important properties of the implementation:

- `hardState` keeps explicit guardrails
- `anchorResource` is derived from the first selected resource
- `anchorConstraint` and `secondaryConstraint` are derived from the first two selected constraints
- `latentForces` are synthesized from canonical questionnaire values and, when available, post-curation answers
- `exposurePattern` is still computed and stored in the type, but `formatConditioning` no longer renders it into the prompt \u2014 it is currently dead data
- `personalitySignature` is derived from Big Five scores without using trait names in the prompt text; only `combinedReading` is rendered into the prompt, the five individual dimensions are dropped to prevent checklist-following

This means the questionnaire is no longer prompt-visible in raw form. The model sees an interpretation of the questionnaire, not a replay of the questionnaire.

### Scan conditioning vs denoise conditioning

The hook uses two slightly different conditioning contexts:

- `scanNoiseFragments()` calls `buildStoryConditioning(fields, big5)`
- `generate()` calls `buildStoryConditioning(fields, big5, curationAnswers)`

So:

- the scan prompt does not know why the user kept specific bullets
- the denoise chain does know that

This is intentional. The curation answers only make sense after the user has actually seen and chosen fragments.

## Prompt Chain

All prompts are assembled in `lib/prompts.ts`.

### Shared formatting

`formatConditioning(...)` compresses the entire `StoryConditioning` object into 4 terse lines:

- `PERSON:` — comma-separated hard facts (age band, mobility, chapter, horizon)
- `SITUATION:` — resource and constraint descriptions, semicolon-separated
- `UNDERCURRENTS:` — latent forces as a single unlabeled paragraph (core tension, momentum, risk, identity pressure, likely transformation, selection charge, rejected gravity). `exposurePattern` is computed but currently excluded from rendering.
- `TEMPERAMENT:` — only the `combinedReading` line; the five individual personality dimensions are dropped to prevent the model from treating them as a checklist.

This is dramatically shorter than the previous version which rendered 21 labeled bullet points across three named sections.

### Shared rules

A `SHARED_RULES` constant is now injected into every non-scan prompt. It enforces:

- concrete nouns (brand names, street names, exact sums)
- texture variation (some flat/ordinary sentences alongside charged ones)
- register mixing
- unexplained images allowed to stand
- contradictions allowed to stand
- no personality labels
- profile invisibility
- a banned vocabulary list (`BANNED_VOCAB`): momentum, trajectory, pattern, chapter, identity, tension, pressure, resilience, alignment, pivot, inflection, compounding

### 1. Scan prompt

Unchanged in structure. Receives formatted conditioning, world-state rule, and guidance scale. Generates 10 unresolved fragments.

### 2. Early structure prompt

For non-final steps where `progress < 0.45`. Now asks for:

- 5-6 sentences of continuous prose drawn from fragments
- open inside a concrete image or action
- at least one ordinary, low-stakes sentence ("a meal, a receipt, a walk home")
- strange fragments left strange, not rationalized
- not required to cover every fragment
- `SHARED_RULES` appended

The old version asked the model to "explain how fragments could begin becoming true" — this produced rationalistic, modular prose. The new version asks for scenes.

### 2b. Critique step (new)

`generateCritiquePrompt(draft, conditioning, lang)` runs after the structure step. It asks a "sharp-eyed story editor" to judge the draft on:

- profile/questionnaire paraphrase leakage
- uniformly literary tone vs varied register
- unexplained images left to breathe
- motifs as concrete actions vs described themes
- at least one unexpected detail or contradiction
- causal chaining vs parallel event listing

Output: 3-5 short, concrete revision notes with specific problems and fixes. These notes feed into the sharpen step.

### 3. Sharpen/revise prompt

For later non-final steps (`progress >= 0.45`). Now asks to:

- rewrite and expand into 2-3 paragraphs (200-350 words)
- preserve existing images and motifs
- replace summary/explanation sentences with concrete details or overheard moments
- break uniform literary tone with plainly stated or slightly banal sentences
- leave at least one thing unexplained
- address critique notes if available
- `SHARED_RULES` appended

If critique notes exist from step 2b, they are injected as a `CRITIQUE NOTES` block.

### 4. Final trajectory prompt

The final step now produces a substantially longer piece:

- **4 paragraphs** separated by blank lines, 400-600 words total, each paragraph 4-8 sentences
- no section labels or numbers

New features:

- **Ordered bullet anchoring**: If 6 bullets were caught, each paragraph is anchored to specific motifs in chamber order (paragraph 1 → bullet 1, paragraph 2 → bullets 2-3, etc.). Motifs appear as images/actions, not quoted or explained.
- **Signature style**: `lib/styles.ts` picks an author voice based on age group and questionnaire affinity scoring. The prompt says "Write in the voice of ${author}. Carry their sentence rhythm, attention, and register. Do not name the author, quote their work, or imitate specific stories."
- `SHARED_RULES` appended

The old version asked for 8-12 sentences. The new version asks for a full short story.

### 5. Cleanup prompt

After denoising, `generateCleanupPrompt(...)` now has:

- An explicit banned-patterns list (personality dimensions, abstract behavioral descriptions, thesis statements, banned vocabulary, motivational-poster language)
- Each banned sentence must be replaced with a concrete scene, image, consequence, or social fact
- Texture check: if every sentence carries the same literary weight, break the pattern with a plain/offhand/mundane sentence
- Must preserve paragraph structure (4 paragraphs separated by blank lines)
- Revised version must be at least as long as the original

This is much stronger than the previous version which only asked to "remove direct profile wording."

## Runtime Flow

The runtime state machine still lives in `useGeneration(...)` in `hooks/useGeneration.ts`.

### Scan phase

`scanNoiseFragments()` does the following:

1. Acquire the generation lock
2. Build scan conditioning from `fields + big5`
3. Clear prior bullets and prior trajectory outputs
4. Build the scan prompt via `generateStepPrompt(0, ...)`
5. Call `/api/generate` with temperature `1.15`
6. Parse numbered fragments with `parseNoiseFragments(...)`
7. Convert each fragment into a `Bullet`
8. Enter `runPhase = "reviewing"`

If parsing yields no fragments, the run errors.

### Bullet curation phase

`lib/revolver.ts` still defines the bullet mechanic.

Each `Bullet` can be:

- `flying`
- `ricocheting`
- `caught`
- `spent`

The exact rules are unchanged:

- the chamber cap is 6
- catch order assigns `chamberIndex`
- only `flying` and `ricocheting` bullets can be caught
- uncaught bullets can advance up to 3 passes
- pass 3 makes the bullet `spent`

The hook still moves into `ready` when:

- 6 bullets are caught, or
- all active bullets are gone and at least 1 bullet was caught

### Post-curation gating

There is now an extra UI gate in `app/page.tsx`.

The fire button is disabled until both of these are true:

- at least one bullet has been caught and the run is otherwise ready
- both `curationAnswers.whyThese` and `curationAnswers.rejectedFuture` have been chosen

So readiness now has two layers:

- hook-level readiness based on bullet state
- page-level readiness based on curation answers

The curation question panel appears when:

- `caughtCount > 0`, and
- either `runPhase === "ready"` or there are no active bullets left

### Seed construction

The denoise chain still does not consume the raw scan output directly.

It consumes `buildBulletSeed(bullets)`, which:

1. Creates a 6-slot chamber snapshot
2. Places caught bullets by `chamberIndex`
3. Drops empty slots
4. Serializes the result as:

```text
1::first caught bullet
2::second caught bullet
...
```

So the visible DNA of the story is still chamber-ordered bullet text.

### Denoise loop

`generate()` now does the following:

1. Refuse to run if locked
2. Refuse to run if no bullets are caught
3. Build full conditioning from `fields + big5 + curationAnswers`
4. Build `mergedNoiseSeed` from caught bullets
5. Build `orderedBulletTexts` sorted by `chamberIndex`
6. Pick `signatureStyle` via `pickSignatureStyle(ageGroup, questionnaireAnswers)` from `lib/styles.ts`
7. Initialize:

```ts
const stepResults = [mergedNoiseSeed];
let critiqueNotes: string | null = null;
```

8. For each `step` from `1` to `denoiseSteps - 1`:
   - build prompt with `prev`, `orderedBulletTexts`, `critiqueNotes`, and `signatureStyle.author`
   - select `maxTokens` based on step type (final: 3000, sharpen: 1800, other: 1000)
   - call the model with temperature `1.05`
   - push the returned text into `stepResults`
   - if this was the structure step (progress < 0.45 and not final), run `generateCritiquePrompt` with temperature `0.7` and store the result in `critiqueNotes`
9. Run the cleanup prompt with temperature `0.8` and maxTokens `3000`
10. Replace the final denoise output with the cleaned trajectory
11. Store:
    - cleaned trajectory in `trajectories`
    - the full step list in `allStepOutputs`

So the canonical final story is:

- not the raw last denoise output
- but the cleaned version returned by the anti-echo pass

### Signature style

`lib/styles.ts` maintains a pool of author voices. `pickSignatureStyle(ageGroup, answers)` selects one by:

1. Filtering to authors whose `ages` array includes the user's age group
2. Scoring each author's `affinities` keywords against taste-bearing questionnaire answers (`magneticScene`, `socialMirror`, `obsessions`, `recurringTrap`, `delayFailureMode`)
3. Picking uniformly from the top-scoring authors

The selected author name is injected into the final step prompt as a voice/register instruction. The model is told to carry their sentence rhythm without naming them, quoting their work, or imitating specific stories.

## Generate Page Summary

The generate screen in `app/page.tsx` no longer presents a "Your Profile" block that simply mirrors the questionnaire.

It now shows `Story Conditions`:

- hard-state chips such as age band, mobility, chapter, horizon
- compressed anchors such as `anchorResource` and `anchorConstraint`
- three text blocks:
  - hidden pressure
  - momentum pattern
  - behavioral personality signature

This UI mirrors the underlying redesign: the system is now explicit about hidden causality rather than explicit about raw profile fields.

The final trajectory is rendered as multi-paragraph prose by `TrajectoryCard`, which splits on double newlines (`\n{2,}`) and renders each paragraph as a separate `<p>` element with spacing.

Dev-only features:

- `randomizeQuestionnaireAnswers()` button to fill all questionnaire steps with random options
- `catchAll` button to catch all flying bullets at once

## API Boundary And Provider Normalization

This layer is unchanged.

`/api/generate` still handles:

- per-IP throttling
- global daily quota
- JSON validation
- normalized error responses
- daily usage headers

`lib/providers.ts` still normalizes provider-specific response formats into:

```ts
{ content: [{ type: "text", text }] }
```

So the client-side generation path still extracts text through one normalized shape regardless of provider.

## What The System Does Not Do

The system still does not:

- run a true diffusion model
- branch and rank multiple candidate futures
- compare alternative final trajectories
- maintain a symbolic planner or world model
- retrieve external user facts
- ground output in named headlines or current events
- treat the questionnaire as free-form autobiography

What it does instead is narrower and more controlled:

- collect structured pressure signals
- convert them into hidden story forces
- let the user choose visible motifs
- rewrite one linear story chain
- clean up questionnaire-like prose at the end

## Worked Example Appendix

This example is synthetic. It only shows how the current code composes.

### Example answers

```ts
const answers: QuestionnaireAnswers = {
  age: ["20–29"],
  mobility: ["Can relocate for the right upside"],
  currentMode: ["Early-career builder"],
  trajectoryFocus: ["Turning skill into real leverage"],
  skills: ["Tech & Engineering", "Writing & Media"],
  resources: ["Some savings", "Strong network", "Open-source reputation"],
  constraints: ["Fear of failure", "Too many options", "Algorithms decide who hears me"],
  obsessions: ["Building something real", "Financial freedom", "Independence"],
  workStyle: ["Quietly, through craft and depth"],
  riskTolerance: ["Go all-in when conviction is high"],
  timeHorizon: ["Before I turn 30"],
  inflection: ["A single piece of work gets noticed by the right person"],
};
```

### Example personality and controls

```ts
const big5 = [8, 6, 4, 5, 7];
const guidance = 8;
const denoiseSteps = 4;
const provider = "openrouter";
const model = "anthropic/claude-sonnet-4.6";
```

### Normalized `Fields`

After `normalizeQuestionnaireAnswers(...)` and `buildFieldsFromAnswers(...)`:

```ts
const fields: Fields = {
  age: "20–29",
  location: "Can relocate for the right upside",
  mobility: "Can relocate for the right upside",
  currentMode: "Early-career builder",
  trajectoryFocus: "Turning skill into real leverage",
  skills: "Tech & Engineering, Writing & Media",
  resources: "Some savings, Strong network, Open-source reputation",
  constraints: "Fear of failure, Too many options, Algorithms decide who hears me",
  obsessions: "Building something real, Financial freedom, Independence",
  workStyle: "Quietly, through craft and depth",
  riskTolerance: "Go all-in when conviction is high",
  timeHorizon: "Before I turn 30",
  inflection: "A single piece of work gets noticed by the right person",
};
```

### Example scan conditioning

The scan call uses:

```ts
const scanConditioning = buildStoryConditioning(fields, big5);
```

That yields a prompt-visible structure shaped roughly like:

```text
BOUNDARY CONDITIONS:
- Age band: 20–29
- Mobility: Can relocate for the right upside
- Current chapter: Early-career builder
- Time horizon: Before I turn 30
- Anchor resource: there is enough runway for compounding to matter
- Primary constraint: proof still trails behind ability
- Secondary constraint: too many live paths are thinning momentum

LATENT FORCES:
- Core tension: capability is arriving faster than public proof...
- Momentum pattern: momentum begins in private until the work becomes harder to dismiss...
- Exposure pattern: credibility grows artifact-first...
- Risk pattern: once conviction crystallizes the commitment becomes total
- Identity pressure: the future has to feel self-authored...
- Likely transformation: a moment of visibility forces a larger identity to appear...

PERSONALITY SIGNATURE:
- Novelty appetite: moves toward novelty before full permission exists
- Consistency pressure: likes structure, but not enough to become mechanical
- Social propulsion: moves between solitude and contact without fully trusting either
- Conflict tolerance: does not chase conflict, but will accept it when a path matters
- Anticipatory sensitivity: feels the stakes vividly...
- Combined reading: moves toward the unfamiliar quickly, then wrestles it into shape...
```

### Example scan result shape

Suppose the scan returns:

```text
1::A product demo watched by the right stranger
2::A codebase people quote by name
3::Late-night drafts that quietly spread
4::Freedom that costs more sleep than expected
5::A train ticket bought before certainty
6::Praise that arrives before self-belief
7::A room that gets quieter when I begin
8::Friends with stable jobs stop making sense
9::A version of me that can't stay hidden
10::The first check that feels unreal
```

### Example bullet curation and post-curation answers

Suppose the user catches bullets 1, 2, 3, and 4, then selects:

```ts
const curationAnswers: CurationAnswers = {
  whyThese: "They feel dangerous but true",
  rejectedFuture: "too safe",
};
```

The chamber-ordered seed becomes:

```text
1::A product demo watched by the right stranger
2::A codebase people quote by name
3::Late-night drafts that quietly spread
4::Freedom that costs more sleep than expected
```

### Example denoise call pattern

With `denoiseSteps = 4`, the runtime makes:

1. scan call
2. denoise step 1
3. denoise step 2
4. denoise step 3
5. cleanup call

The denoise chain sees:

- visible motifs from the selected bullets
- hidden causality from `StoryConditioning`
- added selection tone from `whyThese`
- negative shape from `rejectedFuture`

The final canonical story is the cleaned output from step 5, not the raw output from step 4.
