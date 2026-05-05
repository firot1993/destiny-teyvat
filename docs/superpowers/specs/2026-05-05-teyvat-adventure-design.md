# Teyvat Adventure — Design Spec

**Date:** 2026-05-05
**Branch context:** This work happens in a forked repo (separate from the upstream destiny app). All in-place rewrites are fine — there is no need to preserve the existing destiny flow side-by-side.

## Concept

Drop the user into Teyvat (the world of Genshin Impact). A short vague questionnaire feeds a randomized character reveal, which leads into an open-ended branching adventure of scenes the user navigates by picking vague evocative choices.

The Big Five personality model is removed. The runtime engine (providers, streaming, daily quotas, telemetry, rate limiting, retry/fallback) is reused. The questionnaire, prompts, components, theming, and the multi-pass denoise loop are replaced.

## End-to-end flow

```
Title screen → Questionnaire (7 questions) → Reveal (character card) → Adventure scene loop → Ending
```

State machine (replaces the existing `useGeneration` phases):

```
idle → questionnaire → revealing → reveal-shown → scene-generating → scene-shown → (loop) → ended
```

## Architecture

### New modules

- `lib/teyvat/questionnaire.ts` — 7 vague editorial questions across 3 chapters (Mood, Desire, Conflict). Same shape as the existing `lib/questionnaire.ts` but new content.
- `lib/teyvat/character.ts` — types for `RevealedCharacter` and `Framing`.
- `lib/teyvat/scenes.ts` — types for `Scene` and `AdventureState`.
- `lib/teyvat/prompts.ts` — `buildRevealPrompt`, `parseReveal`, `buildScenePrompt`, `parseScene`.
- `lib/teyvat/elements.ts` — element → palette/symbol lookup table.
- `lib/teyvat/theme.ts` — design tokens (replaces existing `lib/theme.ts`).
- `hooks/useAdventure.ts` — owns the new state machine (replaces `hooks/useGeneration.ts`).

### New components

- `components/teyvat/TitleScreen.tsx` — press-start screen with begin button and settings.
- `components/teyvat/Questionnaire.tsx` — staged single-question screens with chapter intros.
- `components/teyvat/RevealCard.tsx` — staggered character reveal with Vision-acquisition vignette.
- `components/teyvat/SceneView.tsx` — streaming scene prose + 3 vague choice buttons + "stop here".
- `components/teyvat/AdventureLog.tsx` — read-only history of completed scenes.
- `components/teyvat/Ending.tsx` — closing screen with "read again" and "walk a different path".

### Reused without change

- `app/api/generate/route.ts` — provider proxy, throttling, daily quotas, streaming pass-through.
- `lib/providers.ts`, `lib/rateLimit.ts`, `lib/telemetry.ts`, `lib/db.ts`, `lib/sessionId.ts`, `lib/constants.ts`.
- Streaming infrastructure (`callProviderStreaming`, SSE plumbing).
- Per-IP and global daily quota helpers.

### Removed

- `components/Big5Form.tsx`, `components/BulletField.tsx`, `components/AmmoHUD.tsx`, `components/FireImpact.tsx`, `components/TrajectoryCard.tsx`, `components/StoryRating.tsx`.
- `lib/revolver.ts`, `lib/styles.ts`.
- `lib/prompts.ts` (replaced wholesale by `lib/teyvat/prompts.ts`).
- The denoise loop in `useGeneration.ts` (scan → critique → sharpen → quality-gate → cleanup).
- The 3-tab `app/page.tsx` structure (input / big5 / generate).

## Questionnaire

Seven single-select questions across three chapters. All vague — no Genshin terms, no "pick your element."

### Chapter 1 — Mood

**Q1.** *You wake somewhere you don't recognize. What's the first thing you notice?*
- the silence that isn't empty
- a smell of rain on warm stone
- distant voices speaking a language you almost know
- something glowing at the edge of your vision

**Q2.** *The weather you'd choose to walk in for hours:*
- thin cold air after a snowfall
- midday heat with no shade
- a storm that hasn't broken yet
- mist that hides whatever is ahead

### Chapter 2 — Desire

**Q3.** *What would you trade almost anything for?*
- to be remembered for one true thing
- to disappear cleanly and start over
- to know something no one else knows
- to keep one person safe, no matter what

**Q4.** *The kind of mark you'd want to leave:*
- a craft so good people pass it down
- a question that outlives you
- a place that's safer because you were there
- nothing — you'd rather pass through

**Q5.** *When you imagine being powerful, the power looks like:*
- precision — doing one thing perfectly
- influence — people listening when you speak
- knowledge — seeing what others miss
- protection — standing between harm and someone you love

### Chapter 3 — Conflict

**Q6.** *The road splits. Which pull do you trust?*
- the harder climb
- the quieter road
- the one with company
- the one no one's taken

**Q7.** *When something inside you finally breaks open, it sounds like:*
- a long-held breath let out
- a blade drawn slowly
- laughter you didn't expect
- silence — the kind that means you've decided

### Mapping (soft cheat-sheet, given to the LLM in the reveal prompt)

The LLM receives a non-deterministic mapping table that suggests how each option connects to in-world signals (element affinity, nation resonance, archetype hints, weapon hints). The LLM is told to blend signals across all seven answers rather than treat any single one as deterministic. Two users with the same Q1 answer can land on different characters because Q2–Q7 differ.

Examples (illustrative, not exhaustive):
- Q1 *silence that isn't empty* → contemplative archetype, possible Sumeru/Inazuma resonance
- Q1 *something glowing* → curious/scholarly, Sumeru-leaning
- Q2 *storm that hasn't broken yet* → Electro affinity, latent tension
- Q2 *thin cold air* → Cryo affinity, discipline
- Q5 *protection* → Geo or Hydro guardian archetypes
- Q6 *the one no one's taken* → Wanderer/exile archetype, possibly companion-framing with similarly outcast canonicals
- Q7 *a blade drawn slowly* → weapon-type sword/polearm, deliberate fighter

The full mapping table lives in `lib/teyvat/prompts.ts` and is editable as a tuning surface.

## Reveal generation

### Framing

A coin flip at reveal time picks one of two framings (independent of questionnaire answers — same answers can yield protagonist on one run and companion on another):

- **protagonist** — the character stands alone in their own story. No canonical Genshin character is in the spotlight.
- **companion** — the character travels alongside one canonical Genshin character (Xiao, Zhongli, Raiden, Wanderer, Nahida, Furina, etc.) chosen by the model. That character should appear or be felt across most scenes.

### Reveal call

One LLM call. **Streaming OFF** — the card is structured fields, not prose; partial JSON renders as broken UI.

`buildRevealPrompt(answers, framing, language)` produces a prompt that:

- Lists the 7 answers verbatim under their question labels.
- Includes the soft mapping cheat-sheet as inspiration (not rules).
- Instructs the model on framing semantics.
- Constrains `vision` to one of: Anemo, Geo, Electro, Dendro, Hydro, Pyro, Cryo.
- Constrains `nation` to one of: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, or "wandering."
- Constrains `weapon` to one of: sword, claymore, polearm, bow, catalyst.
- Demands a 3-4 sentence Vision-acquisition vignette as the moment the Vision answered.
- Demands a 2-4 word constellation name in Genshin's evocative naming texture.
- Demands a one-line signature ability flavor (no game mechanics).
- Demands JSON only, no surrounding prose.

Output JSON schema:

```json
{
  "name": "...",
  "vision": "Cryo",
  "nation": "Inazuma",
  "weapon": "polearm",
  "archetype": "Wandering Cartographer",
  "bio": "...",
  "visionStory": "...",
  "constellation": "Lantern of Quiet Hours",
  "signature": "...",
  "knownAssociate": "Wanderer — they share a quiet contempt for fate"
}
```

`knownAssociate` is `""` when framing is `protagonist`, non-empty when `companion`.

### Reveal parsing

`parseReveal(rawText)`:

1. Strip code fences if the model wraps JSON in ```json … ```.
2. `JSON.parse`. On failure: one corrective retry with a system message instructing JSON-only output. On second failure: surface a user-facing error and let them re-roll. No silent degradation.
3. Validate required fields exist and `vision` / `nation` / `weapon` are within their enums.
4. If `knownAssociate` is mismatched against framing (e.g., empty when companion), accept as-is — flavor field, not load-bearing.

### Telemetry

One `recordLlmCall` per reveal with `phase: "reveal"`, framing roll, parsed character name, retry count.

## Scene generation

### Scene call

One LLM call per scene. **Streaming ON** — scene prose flows in; the user-facing "page-turning" beat is part of the experience.

The streaming format uses tag-delimited sections (not JSON, which streams poorly):

```
<scene>
[3-5 paragraphs of prose]
</scene>
<choices>
follow the voice
stay where you are
turn back into the rain
</choices>
<closing>false</closing>
<summary>
[ONE sentence recap, used internally for continuity]
</summary>
```

The client streams scene text into the view as it arrives. Once `</scene>` is detected, parsing switches to buffering for the trailing tags. When `</choices>` arrives, choice buttons render. `<closing>true</closing>` suppresses choice buttons and routes to the Ending screen. The summary is kept in `AdventureState` and threaded into subsequent scene prompts.

Tolerant parser: accepts either `</scene>` or the next `<choices>` tag as scene-terminator if the model omits the closing slash.

### Scene prompt inputs

`buildScenePrompt(adventureState, sceneNumber)` receives:

- `character` — the full reveal card.
- `sceneNumber` — 1-indexed.
- `previousScenes` — array of `{sceneNumber, summary, choiceMade}` for all prior scenes. Summaries (one per scene) keep the prompt bounded as the adventure grows.
- `language` — `"en" | "zh"`.

### Pacing matrix

The prompt embeds pacing guidance keyed to `sceneNumber`:

| Scene N | Guidance |
|---|---|
| 1 | "The call." Establish where the character is and what's pulling them in. End on the first crossroad. `closing: false`. |
| 2 | "First commitment." Choice from scene 1 has consequences. Stakes become real. `closing: false`. |
| 3 | "Complication." Something unexpected. Old assumptions strain. `closing: false`. |
| 4 | "Crisis approaches." Real conflict's shape becomes clear. May close at author's discretion. |
| 5 | "Climax window." Strong place to close. Prefer `closing: true` unless a clear thread demands extension. |
| 6 | "Closure expected." Strong push to `closing: true`. Only continue if a major thread is unresolved. |
| 7+ | "Land the plane." `closing: true` required. Write a real ending. |

### Element/region flavor

Every scene must use the character's element, nation, and weapon as concrete sensory detail. A Cryo Inazuman scene should feel cold, ritual, and politically charged. A Pyro Sumeru scene should feel scholarly and warm. The prompt enforces this explicitly.

### Companion presence

If framing is `companion`, the named canonical character should appear or be felt across most scenes — not relegated to a single cameo. The prompt enforces this when `framing === "companion"`.

### Choice handling

After a scene with choices renders:

1. **User picks a choice** → record `choiceMade`, increment `sceneNumber`, generate next scene.
2. **User picks "stop here"** (always-available 4th button, NOT model-generated) → adventure ends with the current scene. Closing card reads "Their story pauses here."
3. **`closing: true` arrives** → no choice buttons, transition to Ending. Closing card reads "Their story ends here."

### Hard cap

Scene 10 is the absolute ceiling. If the model still returns `closing: false` at scene 10, the client overrides and treats it as closing. Prevents runaway loops.

### Telemetry per scene

`recordLlmCall` with `phase: "scene"`, `sceneNumber`, `closing`, and the choice from the previous scene that led to this one.

## State persistence

`AdventureState` lives in component state during a run. It is also serialized to `localStorage` after each scene completes so a tab refresh doesn't kill an in-progress adventure. On app load, if a saved adventure exists, the user is offered "resume" or "start over."

## UX details

### Title screen

App title + one-line tagline ("A short adventure in Teyvat, written for you."). Single "Begin" button. Settings gear (language toggle, provider/model picker) in corner.

### Questionnaire

Reuses the staged-step pattern from `components/InputForm.tsx`. One question per screen. Chapter intro card before Q1, Q3, Q6. Big tappable option cards. After Q7 → "Begin." button rolls framing and fires reveal generation.

### Reveal screen

Loading state (non-streaming wait): centered atmospheric glyph, status line "Listening for your name…" / "翻译你的名字…", no fake progress bar.

Loaded state — staggered reveal animation in 6 beats:

1. Name + Vision symbol fade in
2. Nation, Weapon, Archetype slide up
3. Bio paragraph types in
4. "The day your Vision answered." header + visionStory paragraph types in
5. Constellation name + signature flavor-text appear in a smaller block
6. If companion: "You travel with: {knownAssociate}" line

Bottom: "Walk into the world →" button, disabled until all beats land.

Layout: vertical, single-column, 600px max-width, centered. Element color theme drives the card's accent.

### Scene loop

Top: thin progress strip — "Scene 3" + a faint "↺ See earlier scenes" toggle that opens AdventureLog.

Middle: scene prose, streaming in. Subtle cursor at the leading edge while streaming.

Bottom (appears after `</scene>`):
- 3 choice buttons stacked vertically — vague phrases, no icons, no "Choice A/B/C" prefixes.
- Below choices, separated by spacing: a smaller, lower-contrast "stop here" button.

On choice click: chosen button stays visible (greyed/checked), others fade out, status line "The path responds…", next scene begins streaming. Old scene scrolls up out of view but is accessible via AdventureLog.

When `closing: true` arrives: no choices, "∎" mark, brief pause, auto-transition to Ending.

### Adventure log

Slide-in panel (right side, dismissible). List of completed scenes: scene number + 1-line summary + the choice made. Click a scene → expand to show full scene text inline. Read-only, no rewind.

### Ending

Character name + Vision symbol at top. One-line ending state ("Their story ends here." / "Their story pauses here."). Two buttons:

- **Read it again from the start** → opens AdventureLog full-screen, all scenes in order.
- **Walk a different path** → returns to Title screen, fresh run.

(Deferred to v2: share button that snapshots the reveal card as PNG.)

### Persistent UI

- Settings gear visible on Title and Reveal screens; **hidden during the scene loop** to preserve immersion.
- Daily quota indicator bottom corner, subtle. Only visible when remaining adventures < 3.
- Error toasts at the bottom for API failures. Don't dismiss the in-progress scene.

### Visual direction

Move away from the current app's editorial / typographic / minimal-noir feel. Aim for warm parchment + ink, painterly textures, soft element-color washes that change subtly per character. Inspirations: Genshin loading screens, illustrated novels, BotW bestiary pages.

Avoid: anything that screams "game UI" — no health bars, no element icons in the HUD, no "Lv. 1" badges. The Genshin reference is in the *world*, not the *interface*.

Tokens (Tailwind config-level):
- `lib/teyvat/theme.ts` defines a palette per element (background tint, accent, text emphasis).
- A serif display font for headers (Cormorant Garamond or similar) + a clean humanist sans for body (Inter or system stack).

## Cost and quota considerations

Open-ended scene generation increases per-run cost relative to the original single-pass denoise. A typical run is reveal + 3-7 scenes = 4-8 LLM calls.

- Reveal is small (structured JSON, no streaming, modest token budget).
- Each scene is one streamed call, also modest.
- The pacing matrix's escalating closure pressure keeps median run length manageable.
- Hard cap at scene 10 prevents the worst case.
- Existing per-IP and global daily quotas remain in place. The quota indicator surfaces only when a user is close to the limit.

## Out of scope for v1

- Branching with rewind / retry-this-choice. The adventure is one-directional by design.
- Per-scene rating (UX awkward in an open-ended structure). End-of-run thumbs-up/down may be added later.
- Share-to-image for the reveal card. Worth doing in v2; not blocking.
- Multi-language beyond the existing en/zh pair.
- Voice / audio.

## Open implementation judgments (flagged for the planning pass)

1. **Streaming format fragility.** The `<scene>...</scene>` delimiter convention can break if the model misbehaves. The tolerant parser mitigates most cases. If a specific provider proves unreliable, fall back to non-streaming for scenes from that provider.
2. **`closing` as a model decision.** A poorly-calibrated scene 5 might claim `closing: true` when the arc isn't actually resolved. Acceptable for v1; add a "rate this ending" telemetry signal in a follow-up to detect the failure mode.
3. **Element color theming on the reveal card.** A small but real implementation cost. Worth it for shareability. If schedule pressures, ship a single neutral theme first and add element-tinting in a follow-up.
