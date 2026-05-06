# Prompt Switch System

A small registry + resolver that lets the same `buildRevealPrompt` / `buildScenePrompt` call sites render different prompts at runtime. Used for A/B experiments and for frontend debugging.

## Pieces

- `lib/teyvat/promptVariants.ts` — variant registry. Each entry has `{ id, label, description, weight, buildReveal, buildScene }`. Ships with `v1` (editorial baseline) and `v2-tight` (concise alternate).
- `lib/teyvat/prompts.ts` — public `buildRevealPrompt(answers, framing, language, variantId?)` and `buildScenePrompt(state, sceneNumber, previousChoice, language, variantId?)`. Both default to `DEFAULT_PROMPT_VARIANT_ID` when `variantId` is omitted, so legacy callers and tests are unaffected. The reveal/scene parsers stay shared.
- `lib/teyvat/promptSwitch.ts` — resolver and debug helpers.
- `hooks/useAdventure.ts` — resolves once on mount, threads the id into both builders, and exposes `promptVariant`, `availablePromptVariants`, `setPromptVariant` to the UI.
- `app/page.tsx` — settings panel renders a "Prompt variant" picker that calls `setPromptVariant(...)`.

## Resolution Precedence

`resolvePromptVariant()` returns a known variant id by trying, in order:

1. **URL override** — `?promptVariant=<id>` on the current location. Used by debuggers and shareable links. Validated against the registry; unknown ids are ignored. Not persisted.
2. **localStorage** — `destiny-prompt-variant`. The sticky A/B assignment so a user stays on the same arm across sessions. Validated against the registry; stale ids fall through to the next step.
3. **Weighted random pick** — over `PROMPT_VARIANTS.weight`, persisted on first roll. The picker is injectable for tests via `resolvePromptVariant({ rng, ephemeral })`.

When no `window` is available (SSR), the function returns `DEFAULT_PROMPT_VARIANT_ID` without writing anything.

## Frontend Debug Loop

1. The settings panel select shows every registered variant.
2. Picking one calls `setPromptVariant(id)`, which writes to localStorage. The next reveal/scene call uses that id immediately.
3. Refreshing the page preserves the assignment via localStorage. Clearing localStorage (or visiting with a different `?promptVariant=` value) re-rolls.

## Adding A New Variant

1. Implement `buildReveal` and `buildScene` in `lib/teyvat/promptVariants.ts` (the file already exposes shared helpers like `MAPPING_HINTS`, `NAMING_CONVENTIONS`, `TITLE_GUIDANCE`, and the pacing matrix).
2. Append the entry to `PROMPT_VARIANTS` with a `weight`. Use `0` to keep a variant available to debug pickers but excluded from random A/B assignment.
3. The resolver, the settings picker, and the existing tests for the registry will pick it up automatically. Add at least one variant-specific test if the prompt has hard semantics worth pinning.

## Testing

- `test/teyvat/promptVariants.test.ts` — registry shape, dispatch parity (v1 omitted == v1 explicit), and content differences between v1 and v2-tight.
- `test/teyvat/promptSwitch.test.ts` — URL > localStorage > weighted-random precedence, sticky persistence, ephemeral rolls, and `setPromptVariant` / `clearPromptVariant`.
