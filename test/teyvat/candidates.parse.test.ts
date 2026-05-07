import { describe, expect, it } from "vitest";
import { buildCandidatesPrompt, parseCandidates } from "@/lib/teyvat/candidates";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";

const sampleAnswers = {
  escape: "burnout",
  denied: "respect",
  dominance: "martial",
  pace: "instant",
  humble: "scorners",
  reward: "recognition",
  affinity: "electro",
};

describe("buildCandidatesPrompt", () => {
  it("includes every prefiltered roster entry's id", () => {
    const prefiltered = CANON_ROSTER.slice(0, 8);
    const prompt = buildCandidatesPrompt(sampleAnswers, prefiltered, "en");
    for (const c of prefiltered) {
      expect(prompt).toContain(c.id);
    }
  });

  it("requests output language English when given 'en'", () => {
    const prompt = buildCandidatesPrompt(sampleAnswers, CANON_ROSTER.slice(0, 8), "en");
    expect(prompt).toMatch(/English/i);
  });

  it("requests Chinese output when given 'zh'", () => {
    const prompt = buildCandidatesPrompt(sampleAnswers, CANON_ROSTER.slice(0, 8), "zh");
    expect(prompt).toMatch(/Chinese|中文/i);
  });
});

describe("parseCandidates", () => {
  const allowedIds = new Set(CANON_ROSTER.slice(0, 8).map((c) => c.id));

  it("accepts a valid response with 3-5 candidates", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "you wake..." },
        { id: CANON_ROSTER[1].id, hook: "you wake..." },
        { id: CANON_ROSTER[2].id, hook: "you wake..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseCandidates("not json", allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects fewer than 3 candidates", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 5 candidates", () => {
    const raw = JSON.stringify({
      candidates: CANON_ROSTER.slice(0, 6).map((c) => ({ id: c.id, hook: "..." })),
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects unknown ids", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: "not-real-character", hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects empty hooks", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "" },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("strips code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    }) + "\n```";
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(true);
  });
});
