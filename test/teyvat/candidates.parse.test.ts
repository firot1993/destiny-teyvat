import { describe, expect, it } from "vitest";
import {
  buildFatedRevealPrompt,
  parseFatedReveal,
  pickFatedCharacter,
} from "@/lib/teyvat/candidates";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

const sampleAnswers: TeyvatAnswers = {
  escape: "burnout",
  denied: "respect",
  dominance: "martial",
  pace: "instant",
  humble: "scorners",
  reward: "recognition",
  affinity: "electro",
};

const validResponse = {
  why: "Your edges are too sharp for ordinary days. The Plane of Euthymia recognizes its own.",
  directions: [
    { id: "revenge", title: "Lightning Repays in Kind", hook: "you wake on a balcony..." },
    { id: "ascent", title: "Climb Past the Heavens", hook: "you wake to a court bowed..." },
    { id: "throne", title: "Take the Empty Seat", hook: "you wake with the seal..." },
  ],
};

describe("buildFatedRevealPrompt", () => {
  it("includes the chosen character's id, name, vision, nation, and weapon", () => {
    const c = CANON_ROSTER[0];
    const prompt = buildFatedRevealPrompt(sampleAnswers, c, "en");
    expect(prompt).toContain(c.id);
    expect(prompt).toContain(c.nameEn);
    expect(prompt).toContain(c.nameZh);
    expect(prompt).toContain(c.vision);
    expect(prompt).toContain(c.nation);
    expect(prompt).toContain(c.weapon);
  });

  it("requests output language English when given 'en'", () => {
    const prompt = buildFatedRevealPrompt(sampleAnswers, CANON_ROSTER[0], "en");
    expect(prompt).toMatch(/English/i);
  });

  it("requests Chinese output when given 'zh'", () => {
    const prompt = buildFatedRevealPrompt(sampleAnswers, CANON_ROSTER[0], "zh");
    expect(prompt).toMatch(/Chinese|中文/);
  });

  it("asks for exactly 3 directions", () => {
    const prompt = buildFatedRevealPrompt(sampleAnswers, CANON_ROSTER[0], "en");
    expect(prompt).toMatch(/exactly 3/);
  });
});

describe("pickFatedCharacter", () => {
  it("returns a single CanonCharacter from the roster", () => {
    const c = pickFatedCharacter(CANON_ROSTER, sampleAnswers);
    expect(CANON_ROSTER.some((entry) => entry.id === c.id)).toBe(true);
  });

  it("is deterministic for the same answers", () => {
    const a = pickFatedCharacter(CANON_ROSTER, sampleAnswers).id;
    const b = pickFatedCharacter(CANON_ROSTER, sampleAnswers).id;
    expect(a).toBe(b);
  });

  it("respects affinity vision when present", () => {
    const c = pickFatedCharacter(CANON_ROSTER, { ...sampleAnswers, affinity: "electro" });
    // The top result for an electro/martial/instant signal must itself be electro,
    // because affinity adds +2 and the top spot will resolve to one of the
    // electro+martial entries (e.g. raiden-shogun or tartaglia under different roster orders).
    expect(c.vision).toBe("Electro");
  });
});

describe("parseFatedReveal", () => {
  it("accepts a valid response with why + 3 directions", () => {
    const result = parseFatedReveal(JSON.stringify(validResponse));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.why).toContain("Plane of Euthymia");
      expect(result.directions).toHaveLength(3);
      expect(result.directions[0].id).toBe("revenge");
    }
  });

  it("rejects malformed JSON", () => {
    const result = parseFatedReveal("not json");
    expect(result.ok).toBe(false);
  });

  it("rejects missing 'why'", () => {
    const { why: _why, ...withoutWhy } = validResponse;
    const result = parseFatedReveal(JSON.stringify(withoutWhy));
    expect(result.ok).toBe(false);
  });

  it("rejects empty 'why'", () => {
    const result = parseFatedReveal(JSON.stringify({ ...validResponse, why: "  " }));
    expect(result.ok).toBe(false);
  });

  it("rejects fewer than 3 directions", () => {
    const result = parseFatedReveal(
      JSON.stringify({ ...validResponse, directions: validResponse.directions.slice(0, 2) })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects more than 3 directions", () => {
    const result = parseFatedReveal(
      JSON.stringify({
        ...validResponse,
        directions: [...validResponse.directions, { id: "extra", title: "x", hook: "y" }],
      })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate direction ids", () => {
    const result = parseFatedReveal(
      JSON.stringify({
        ...validResponse,
        directions: [
          validResponse.directions[0],
          validResponse.directions[0],
          validResponse.directions[2],
        ],
      })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects empty direction title", () => {
    const result = parseFatedReveal(
      JSON.stringify({
        ...validResponse,
        directions: [
          { ...validResponse.directions[0], title: "" },
          validResponse.directions[1],
          validResponse.directions[2],
        ],
      })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects empty direction hook", () => {
    const result = parseFatedReveal(
      JSON.stringify({
        ...validResponse,
        directions: [
          { ...validResponse.directions[0], hook: "" },
          validResponse.directions[1],
          validResponse.directions[2],
        ],
      })
    );
    expect(result.ok).toBe(false);
  });

  it("strips code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(validResponse) + "\n```";
    const result = parseFatedReveal(raw);
    expect(result.ok).toBe(true);
  });
});
