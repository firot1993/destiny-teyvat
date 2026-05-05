# Teyvat Reveal: Name Quality + Title Field

Date: 2026-05-05
Status: Approved, ready for implementation plan

## Problem

The reveal step in the Teyvat adventure produces character names that feel
trivial. Concrete failure example from a recent run: a Cryo character from
Inazuma was named "霜凛" (Shuānglǐn — literally "frost + chill"). This is a
pure mood-word, contains an element-coded character (霜) for a Cryo character,
and follows no recognizable Inazuma (Japanese-phonetic) convention.

Five failure modes show up across runs:

1. Names are plain or generic, not Teyvat-flavored.
2. Names ignore the character's nation (a Liyue character gets a Mondstadt
   name, an Inazuma character gets a wuxia-flavored name).
3. Names lack the Genshin texture of titles, epithets, or honorifics —
   real Genshin characters carry a second identity (神里绫华「白鹭氷华」,
   甘雨「循循守月」, Diluc 「Darknight Hero」).
4. Names feel recycled across runs — the same vibe every time.
5. Element words leak into the name itself (霜/冰/雪 for Cryo, 焰/火 for Pyro,
   Storm/Sturm for Electro).

## Goal

Lift the perceived quality of the reveal by:

- Forcing names to follow nation-specific naming conventions.
- Banning element words from names so the element shows up in the title,
  vision story, and signature instead.
- Adding a `title` field to the character — the in-world epithet that real
  Genshin characters carry — and rendering it on the reveal card with the
  canonical 「」 bracket treatment.
- Preventing canon character names from leaking into the generated output.

Out of scope: scene generation prompt, telemetry event for collision rate,
two-pass generation flow.

## Approach

Single-pass generation, same as today. The model is asked to produce both
`name` and `title` in the same JSON response. Three changes carry the weight:

1. **Schema:** add `title` to `RevealedCharacter`.
2. **Prompt:** add a nation naming-conventions block, naming constraints
   (no element words, no mood-word names, follow the nation), and a title
   guidance section with concrete canon examples.
3. **Validation:** check generated name and title against a deterministic
   canon-name blocklist, treating collisions as parse errors so the existing
   single corrective retry path handles them.

## Schema change

`lib/teyvat/character.ts`:

```ts
export interface RevealedCharacter {
  framing: Framing;
  name: string;
  title: string;        // NEW
  vision: Vision;
  nation: Nation;
  weapon: Weapon;
  archetype: string;
  bio: string;
  visionStory: string;
  constellation: string;
  signature: string;
  knownAssociate: string;
}
```

`validateRevealedCharacter` adds `title` to the same non-empty-string check
applied to `archetype`, `bio`, `visionStory`, `constellation`, `signature`.

No durable migration needed: characters are not persisted across schema
versions in any system that needs to be backward-compatible. Local storage
is per-run and resumes within the same code version. Telemetry is
best-effort and tolerates new fields.

## Prompt changes (`buildRevealPrompt`)

Three additions, in this order in the prompt body.

### 1. Nation naming conventions

Inserted after the `MAPPING_HINTS` block:

```
Naming conventions by nation:
- Mondstadt: Germanic/European (Diluc, Jean, Klee, Albedo, Eula, Kaeya)
- Liyue: Chinese, two or three characters (甘雨, 钟离, 凝光, 行秋, 申鹤)
- Inazuma: Japanese phonetic, often family + given (神里绫华, 八重神子, 早柚, 九条裟罗)
- Sumeru: Persian/Arabic/South Asian (Nahida, Tighnari, Cyno, Dehya, Layla)
- Fontaine: French (Furina, Lyney, Lynette, Wriothesley, Clorinde)
- Natlan: Mesoamerican-inspired (Mavuika, Kachina, Kinich, Mualani)
- Snezhnaya: Russian / Slavic (Tartaglia, Pulcinella, Arlecchino)
- wandering: pick the convention that best fits the character's origin hint in their bio
```

### 2. Naming constraints

Added to the existing constraints list:

```
- The name must follow the nation's naming convention above. A Liyue
  character must have a Chinese name; an Inazuma character must have a
  Japanese-phonetic name; etc.
- Do not put element words in the name (no 霜/冰/雪 for Cryo, no 焰/火 for
  Pyro, no Storm/Sturm for Electro, etc.). The element shows up in the
  title, vision story, and signature — not the name itself.
- Avoid pure mood-word names (霜凛, Frostbite, Sturmherz). Real Teyvat
  names sound like names, not attributes.
- The name and title must not match, contain, or be a short form of any
  canonical Genshin character. The canonical examples below are for texture
  only — do not reuse them.
```

### 3. Title field guidance

Added before the schema block:

```
"title" is the character's in-world epithet — the second name they're
known by. Examples:
- 神里绫华「白鹭氷华」
- 甘雨「循循守月」
- 八重神子「宫司大人」
- Diluc 「Darknight Hero」
- Furina 「Hydro Archon」

The title is what others call them, or what their reputation is. It should:
- Reference their role, deed, or bearing — not their element directly
- Be 2-6 characters in Chinese, or 2-4 words in English
- Feel earned, not decorative
```

Schema example in the prompt updates to include `"title": "..."` between
`name` and `vision`.

### Judgment calls

- **Element ban is strict.** This forbids "霜凛"-style names but also
  forbids legitimate names like "凝光" (which contains 凝, a cold-adjacent
  word). The strict version is correct because the failure mode is the
  dominant one. Soften only if names start feeling sterile in practice.
- **Title examples are canon characters.** This risks the model copying
  them verbatim. Mitigated by the explicit "do not reuse them" constraint
  and by the canon blocklist below. Concrete examples lift naming quality
  more than abstract ones; the abstract approach is what produces the
  "霜凛" failure mode in the first place.

## Canon name blocklist

New file `lib/teyvat/canonNames.ts`:

```ts
export const CANON_NAMES: readonly string[];  // see "Blocklist contents" below
export function matchesCanonName(value: string): string | null;
```

### Blocklist contents

Enumerated at implementation time, not in this spec. Sourced from the
playable Genshin roster as of the current game version. For each
character, include:

- The full canonical name in Chinese (e.g. `"神里绫华"`).
- The full canonical name in English (e.g. `"Kamisato Ayaka"`).
- Common short forms in both languages (e.g. `"绫华"`, `"Ayaka"`).
- For characters with a single mononym (Nahida, Furina), one entry per
  language is enough.

Roughly 80 characters × 2-4 entries each = ~200-300 strings. Seeded
once at implementation; updated as needed when the model starts leaking
new characters in practice.

`matchesCanonName` does case-insensitive substring matching in both
directions:

- A generated `"绫华"` matches canon `"神里绫华"` (substring of canon).
- A generated `"神里小百合"` matches canon `"神里"` (canon as substring of
  generated — catches family-name leak).
- For English entries, word-boundary matching to avoid false positives like
  "Eulalia" matching "Eula".

Returns the matched canon name on collision, or `null`.

Lives in its own file (not `elements.ts`) because it is data-shaped and
will grow over time, while `elements.ts` is a small enum-typed module.

## Validation + retry

In `parseReveal`, after the existing `validateRevealedCharacter` check
passes, run the blocklist check:

```ts
const nameMatch = matchesCanonName(candidate.name);
const titleMatch = matchesCanonName(candidate.title);
if (nameMatch || titleMatch) {
  return {
    ok: false,
    errors: [
      nameMatch ? `name '${candidate.name}' collides with canonical character '${nameMatch}'` : null,
      titleMatch ? `title '${candidate.title}' collides with canonical character '${titleMatch}'` : null,
    ].filter(Boolean) as string[],
  };
}
```

The existing reveal flow already retries once on `ok: false`, feeding the
errors back into a corrective prompt. The collision message is specific
enough that the second attempt usually succeeds.

If the second attempt still collides, accept it. The cost of one in
thousands of reveals containing "绫华" is lower than the cost of a third
retry's latency, and the existing flow is best-effort in spirit.

## Reveal card UI (`components/teyvat/RevealCard.tsx`)

Render `title` directly under `name` in beat 1 of the existing 6-beat
reveal sequence. Title is part of the character's identity, not a
separately-revealed fact, so it appears with the name.

```tsx
<h1 style={nameStyle}>{character.name}</h1>
{character.title ? (
  <p style={titleStyle}>
    {language === "zh" ? `「${character.title}」` : `— ${character.title} —`}
  </p>
) : null}
```

`titleStyle`: `FONT_DISPLAY` serif, italic, ~18px, `INK_SOFT` color, slight
top margin (4-6px). Subordinate to the name but clearly part of the same
identity block; visually distinct from the all-caps tracked-out meta line
below.

Bracket treatment is language-conditional:

- Chinese: `「title」` — the canonical Genshin presentation.
- English: `— title —` — em-dash flanking, since 「」 reads awkwardly in
  Latin script.

`RevealCard` does not currently know the active language. Either expose
`language` from the i18n context (`useI18n`) or pass it as a prop from
`app/page.tsx`. Implementer's choice based on which fits the existing
shape; preference for adding to the i18n context if it cleanly extends.

The conditional render (`character.title ? ...`) guards against in-progress
adventures resumed from local storage that predate this schema change.
Without the guard, a resume would either crash on undefined or render
empty brackets.

## Storage compatibility (`lib/teyvat/storage.ts`)

Storage reads return whatever is on disk. The card render guards for
missing `title`. Validation runs at parse time on fresh generations, not
on storage reads, so old stored adventures continue to load — they just
render without the title line until a new reveal is generated.

If the stored shape is replayed into the scene prompt, that path uses
`character.name` only (not `title`), so it is unaffected.

## Files touched

- `lib/teyvat/character.ts` — `title` field + validation
- `lib/teyvat/canonNames.ts` — new file, blocklist + matcher
- `lib/teyvat/prompts.ts` — three prompt additions, collision check in
  `parseReveal`
- `components/teyvat/RevealCard.tsx` — render `title` with language-conditional brackets
- `i18n/index.tsx` — expose `language` from context if not already
- `doc/architecture/` — extend reveal-prompt notes with title field,
  naming conventions, and canon collision check
- `doc/worklog/2026-05-05.md` — append entry
- `CLAUDE.md` — one-liner under "Prompting" about naming conventions and
  canon blocklist

## Out of scope

- Telemetry event for collision rate
- Two-pass generation (deferred — option C from brainstorming)
- Changes to `buildScenePrompt`; scenes continue to use `character.name`
  only. Whether other characters address the protagonist by their title in
  prose is left to the model's authorial judgment from context.

## Open questions

None. All judgment calls explicitly resolved above.
