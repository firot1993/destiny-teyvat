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
