import type { Language } from "@/types";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { Vision } from "@/lib/teyvat/elements";

const PREFILTER_MIN = 6;
const PREFILTER_MAX = 10;

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

const LANG_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

function answersBlock(answers: TeyvatAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

function rosterBlock(roster: CanonCharacter[]): string {
  return roster
    .map(
      (c) =>
        `- id: ${c.id} | ${c.nameEn} (${c.nameZh}) — ${c.vision} ${c.weapon} from ${c.nation} | tags: ${c.archetypeTags.join(", ")}`
    )
    .join("\n");
}

export function buildCandidatesPrompt(
  answers: TeyvatAnswers,
  prefilteredRoster: CanonCharacter[],
  language: Language
): string {
  const outputLanguage = LANG_NAMES[language] ?? LANG_NAMES.en;
  return `You are casting a wish-fulfillment (爽文) transmigration adventure set in Genshin Impact / Teyvat.

The reader gave these answers (treat as emotional signal, do not echo verbatim):
${answersBlock(answers)}

Pick 3 to 5 of the canonical Genshin characters below whose archetypes most resonate with the reader's answers. Prefer diversity across vision/nation when scoring is close.

Available characters (you must use one of these exact ids):
${rosterBlock(prefilteredRoster)}

For each picked character, write a transmigration "awakening hook" — 2 to 3 sentences in ${outputLanguage}, in second person, in 爽文 tone. The hook describes the moment the modern reader wakes up *as* this canonical character with their memories and powers intact. Lean into the power-fantasy: dominance shown not told, the world bending around the protagonist, the inheritance arriving fully formed.

Constraints:
- Hooks should feel inevitable, not explained.
- Do not narrate canonical bio. The reader knows who this character is.
- Do not mention questionnaires, prompts, or meta process.
- Output raw JSON only. No prose before or after. No code fences.

Schema:
{
  "candidates": [
    { "id": "raiden-shogun", "hook": "..." },
    { "id": "zhongli", "hook": "..." }
  ]
}`;
}

export type CandidatesParseResult =
  | { ok: true; candidates: { id: string; hook: string }[] }
  | { ok: false; errors: string[] };

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseCandidates(
  raw: string,
  allowedIds: Set<string>
): CandidatesParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${(error as Error).message}`] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["parsed JSON is not an object"] };
  }

  const candidatesField = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidatesField)) {
    return { ok: false, errors: ["'candidates' must be an array"] };
  }

  if (candidatesField.length < 3 || candidatesField.length > 5) {
    return {
      ok: false,
      errors: [`'candidates' must contain 3 to 5 entries, got ${candidatesField.length}`],
    };
  }

  const errors: string[] = [];
  const out: { id: string; hook: string }[] = [];
  const seen = new Set<string>();

  for (const entry of candidatesField) {
    if (typeof entry !== "object" || entry === null) {
      errors.push("each candidate must be an object");
      continue;
    }
    const id = (entry as { id?: unknown }).id;
    const hook = (entry as { hook?: unknown }).hook;
    if (typeof id !== "string" || !id) {
      errors.push("each candidate must have a non-empty 'id' string");
      continue;
    }
    if (!allowedIds.has(id)) {
      errors.push(`unknown candidate id '${id}' — must be one from the prefiltered roster`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`duplicate candidate id '${id}'`);
      continue;
    }
    seen.add(id);
    if (typeof hook !== "string" || hook.trim() === "") {
      errors.push(`candidate '${id}' has an empty hook`);
      continue;
    }
    out.push({ id, hook: hook.trim() });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, candidates: out };
}
