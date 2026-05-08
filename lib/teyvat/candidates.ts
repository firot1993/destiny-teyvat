import type { Language } from "@/types";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { Vision } from "@/lib/teyvat/elements";

const PREFILTER_MIN = 6;
const PREFILTER_MAX = 10;
const DIRECTION_COUNT = 3;

const AFFINITY_TO_VISION: Record<string, Vision | undefined> = {
  electro: "Electro",
  geo: "Geo",
  pyro: "Pyro",
  cryo: "Cryo",
  anemo: "Anemo",
  hydro: "Hydro",
  dendro: "Dendro",
};

function score(c: CanonCharacter, answers: TeyvatAnswers): number {
  let s = 0;
  if (answers.dominance && (c.powerFantasyAxes.dominance as readonly string[]).includes(answers.dominance)) s += 3;
  if (answers.pace && (c.powerFantasyAxes.pace as readonly string[]).includes(answers.pace)) s += 2;
  if (answers.humble && (c.powerFantasyAxes.humbleTargets as readonly string[]).includes(answers.humble)) s += 2;
  if (answers.reward && (c.powerFantasyAxes.rewards as readonly string[]).includes(answers.reward)) s += 2;
  const affinityVision = answers.affinity ? AFFINITY_TO_VISION[answers.affinity] : undefined;
  if (affinityVision && c.vision === affinityVision) s += 2;
  return s;
}

/**
 * Narrow the canon roster to the top ~6-10 candidates by tag overlap.
 * Stable: ties broken by roster order. Pads to PREFILTER_MIN by roster order
 * when scoring is sparse.
 */
export function prefilterRoster(
  roster: CanonCharacter[],
  answers: TeyvatAnswers
): CanonCharacter[] {
  const scored = roster.map((c, idx) => ({ c, score: score(c, answers), idx }));
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  const top = scored.slice(0, PREFILTER_MAX);
  if (top.length >= PREFILTER_MIN) {
    return top.map((entry) => entry.c);
  }
  return scored.slice(0, PREFILTER_MIN).map((entry) => entry.c);
}

/**
 * Pick the single highest-scoring canon character for these answers.
 * Deterministic for fixed answers + roster order; falls back to the first
 * roster entry if the roster is empty (which should never happen).
 */
export function pickFatedCharacter(
  roster: CanonCharacter[],
  answers: TeyvatAnswers
): CanonCharacter {
  const top = prefilterRoster(roster, answers);
  return top[0] ?? roster[0];
}

const LANG_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

function answersBlock(answers: TeyvatAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

export function buildFatedRevealPrompt(
  answers: TeyvatAnswers,
  character: CanonCharacter,
  language: Language
): string {
  const outputLanguage = LANG_NAMES[language] ?? LANG_NAMES.en;
  return `You are casting a wish-fulfillment (爽文) transmigration adventure set in Genshin Impact / Teyvat.

The reader's awakening is fixed — they wake up as this canonical Genshin character with memories and powers intact:
- id: ${character.id}
- name: ${character.nameEn} (${character.nameZh})
- vision: ${character.vision}
- nation: ${character.nation}
- weapon: ${character.weapon}
- archetype tags: ${character.archetypeTags.join(", ")}

The reader gave these answers (treat as emotional signal, do not echo verbatim):
${answersBlock(answers)}

Write two things in ${outputLanguage}:

1. "why" — 2 to 3 sentences in second-person, mythic destiny voice. Name the resonance between the reader's answers and this character's silhouette: what about who they already are made this awakening inevitable. Do not mention questionnaires, prompts, scoring, or meta process. Do not narrate the character's bio. Do not address the character — address the reader.

2. "directions" — exactly ${DIRECTION_COUNT} distinct opening story directions for this awakening. Each direction is a different story this run could become. They must feel like genuinely different arcs (revenge vs ascent vs romance vs mystery vs reversal vs exile, etc.) — not flavors of the same plot. Each direction has:
   - id: a short lowercase slug (one word, e.g. "revenge", "ascent", "romance", "mystery", "reversal", "exile", "vengeance", "throne", "rescue", "hunt")
   - title: a 4 to 8 word evocative title in ${outputLanguage}. In Chinese, wrap the title in 「」 brackets. In English, use plain text — no brackets.
   - hook: 2 to 3 sentences in second-person, 爽文 tone, setting up the opening situation of that arc. Lean into power-fantasy: dominance shown not told, the world bending toward the protagonist, the inheritance arriving fully formed. Do not mention prompts or meta process.

Direction ids must be unique within this output.

Output raw JSON only. No prose before or after. No code fences.

Schema:
{
  "why": "...",
  "directions": [
    { "id": "revenge", "title": "...", "hook": "..." },
    { "id": "ascent",  "title": "...", "hook": "..." },
    { "id": "romance", "title": "...", "hook": "..." }
  ]
}`;
}

export interface ParsedDirection {
  id: string;
  title: string;
  hook: string;
}

export type FatedRevealParseResult =
  | { ok: true; why: string; directions: ParsedDirection[] }
  | { ok: false; errors: string[] };

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseFatedReveal(raw: string): FatedRevealParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${(error as Error).message}`] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["parsed JSON is not an object"] };
  }

  const errors: string[] = [];

  const whyField = (parsed as { why?: unknown }).why;
  if (typeof whyField !== "string" || whyField.trim() === "") {
    errors.push("'why' must be a non-empty string");
  }

  const directionsField = (parsed as { directions?: unknown }).directions;
  if (!Array.isArray(directionsField)) {
    errors.push("'directions' must be an array");
    return { ok: false, errors };
  }

  if (directionsField.length !== DIRECTION_COUNT) {
    errors.push(`'directions' must contain exactly ${DIRECTION_COUNT} entries, got ${directionsField.length}`);
  }

  const out: ParsedDirection[] = [];
  const seen = new Set<string>();

  for (const entry of directionsField) {
    if (typeof entry !== "object" || entry === null) {
      errors.push("each direction must be an object");
      continue;
    }
    const id = (entry as { id?: unknown }).id;
    const title = (entry as { title?: unknown }).title;
    const hook = (entry as { hook?: unknown }).hook;

    if (typeof id !== "string" || id.trim() === "") {
      errors.push("each direction must have a non-empty 'id' string");
      continue;
    }
    const normalizedId = id.trim();
    if (seen.has(normalizedId)) {
      errors.push(`duplicate direction id '${normalizedId}'`);
      continue;
    }
    seen.add(normalizedId);

    if (typeof title !== "string" || title.trim() === "") {
      errors.push(`direction '${normalizedId}' has an empty title`);
      continue;
    }
    if (typeof hook !== "string" || hook.trim() === "") {
      errors.push(`direction '${normalizedId}' has an empty hook`);
      continue;
    }

    out.push({ id: normalizedId, title: title.trim(), hook: hook.trim() });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    why: (whyField as string).trim(),
    directions: out,
  };
}
