import { describe, expect, it } from "vitest";
import { buildRevealPrompt, parseReveal } from "@/lib/teyvat/prompts";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

const ANSWERS: TeyvatAnswers = {
  wakeNotice: "the silence that isn't empty",
  weather: "thin cold air after a snowfall",
  trade: "to know something no one else knows",
  mark: "a question that outlives you",
  power: "knowledge — seeing what others miss",
  fork: "the one no one's taken",
  break: "silence — the kind that means you've decided",
};

describe("buildRevealPrompt", () => {
  it("includes all seven answers verbatim", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    for (const answer of Object.values(ANSWERS)) {
      expect(prompt).toContain(answer);
    }
  });

  it("declares the framing in the prompt", () => {
    const protagonist = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const companion = buildRevealPrompt(ANSWERS, "companion", "en");
    expect(protagonist.toLowerCase()).toContain("protagonist");
    expect(companion.toLowerCase()).toContain("companion");
  });

  it("constrains the JSON output schema", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt).toContain('"vision"');
    expect(prompt).toContain('"nation"');
    expect(prompt).toContain('"knownAssociate"');
    expect(prompt).toContain('"title"');
  });

  it("specifies the output language", () => {
    const en = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const zh = buildRevealPrompt(ANSWERS, "protagonist", "zh");
    expect(en).toMatch(/English/i);
    expect(zh).toMatch(/Chinese|中文/i);
  });

  it("describes nation naming conventions", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("naming convention");
    expect(prompt).toContain("Inazuma");
    expect(prompt).toContain("Liyue");
  });

  it("forbids element words in names", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("element word");
  });

  it("describes the title field with examples", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("title");
    expect(prompt).toContain("「");
  });

  it("forbids reusing canonical character names", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("canonical");
  });
});

describe("parseReveal", () => {
  const validJson = JSON.stringify({
    name: "Yuna",
    title: "The Quiet Cartographer",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "polearm",
    archetype: "Wandering Cartographer",
    bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
    visionStory:
      "She drew the cliff line once more. The wave rose without mercy. The ice answered in her hand before the storm could swallow the name she was trying to keep.",
    constellation: "Lantern of Quiet Hours",
    signature: "A blade of ice that remembers the last hand it held.",
    knownAssociate: "",
  });

  it("parses raw JSON into a RevealedCharacter", () => {
    const result = parseReveal(validJson, "protagonist");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.name).toBe("Yuna");
      expect(result.character.title).toBe("The Quiet Cartographer");
      expect(result.character.framing).toBe("protagonist");
    }
  });

  it("strips json code fences", () => {
    const wrapped = `\`\`\`json\n${validJson}\n\`\`\``;
    const result = parseReveal(wrapped, "protagonist");
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = parseReveal("not json", "protagonist");
    expect(result.ok).toBe(false);
  });

  it("rejects character with bad enum values", () => {
    const bad = JSON.stringify({ ...JSON.parse(validJson), vision: "Light" });
    const result = parseReveal(bad, "protagonist");
    expect(result.ok).toBe(false);
  });

  it("attaches the framing to the parsed character", () => {
    const companion = JSON.stringify({
      ...JSON.parse(validJson),
      knownAssociate: "Wanderer — a mirror in motion",
    });
    const result = parseReveal(companion, "companion");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.framing).toBe("companion");
    }
  });

  it("rejects when the name collides with a canonical character", () => {
    const collision = JSON.stringify({ ...JSON.parse(validJson), name: "Furina" });
    const result = parseReveal(collision, "protagonist");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /canonical/i.test(e))).toBe(true);
    }
  });

  it("rejects when the title collides with a canonical character", () => {
    const collision = JSON.stringify({ ...JSON.parse(validJson), title: "Hydro Archon Furina" });
    const result = parseReveal(collision, "protagonist");
    expect(result.ok).toBe(false);
  });

  it("does NOT trip the canon check on a Chinese-substring false positive that shares no canon", () => {
    const safe = JSON.stringify({ ...JSON.parse(validJson), name: "霜见" });
    const result = parseReveal(safe, "protagonist");
    expect(result.ok).toBe(true);
  });
});