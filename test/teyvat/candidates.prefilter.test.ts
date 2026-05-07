import { describe, expect, it } from "vitest";
import { prefilterRoster } from "@/lib/teyvat/candidates";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

const allAnswers: TeyvatAnswers = {
  escape: "burnout",
  denied: "respect",
  dominance: "martial",
  pace: "instant",
  humble: "scorners",
  reward: "recognition",
  affinity: "electro",
};

describe("prefilterRoster", () => {
  it("returns at most 10 entries", () => {
    expect(prefilterRoster(CANON_ROSTER, allAnswers).length).toBeLessThanOrEqual(10);
  });

  it("returns at least 6 entries even when answers are sparse", () => {
    expect(prefilterRoster(CANON_ROSTER, {} as TeyvatAnswers).length).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic for the same input", () => {
    const a = prefilterRoster(CANON_ROSTER, allAnswers).map((c) => c.id);
    const b = prefilterRoster(CANON_ROSTER, allAnswers).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it("includes martial+instant matches when those are the answers", () => {
    const martial = prefilterRoster(CANON_ROSTER, {
      ...allAnswers,
      dominance: "martial",
      pace: "instant",
    });
    const ids = martial.map((c) => c.id);
    expect(ids).toContain("tartaglia");
  });

  it("electro affinity boosts an electro-vision character into the top half", () => {
    const electro = prefilterRoster(CANON_ROSTER, { ...allAnswers, affinity: "electro" });
    const top = electro.slice(0, Math.ceil(electro.length / 2));
    const hasElectro = top.some((c) => c.vision === "Electro");
    expect(hasElectro).toBe(true);
  });
});
