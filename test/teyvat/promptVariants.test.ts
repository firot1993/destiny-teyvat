import { describe, expect, it } from "vitest";
import {
  buildRevealPrompt,
  buildScenePrompt,
} from "@/lib/teyvat/prompts";
import {
  DEFAULT_PROMPT_VARIANT_ID,
  PROMPT_VARIANTS,
  getPromptVariant,
  isKnownPromptVariant,
  listPromptVariants,
} from "@/lib/teyvat/promptVariants";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";

const ANSWERS: TeyvatAnswers = {
  wakeNotice: "the silence that isn't empty",
  weather: "thin cold air after a snowfall",
  trade: "to know something no one else knows",
  mark: "a question that outlives you",
  power: "knowledge — seeing what others miss",
  fork: "the one no one's taken",
  break: "silence — the kind that means you've decided",
};

const CHARACTER: RevealedCharacter = {
  framing: "protagonist",
  name: "Yuna",
  title: "The Quiet Cartographer",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads.",
  visionStory: "The wave rose. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "",
};

const STATE: AdventureState = {
  id: "variant-test",
  character: CHARACTER,
  scenes: [],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-05T00:00:00Z",
};

describe("PROMPT_VARIANTS registry", () => {
  it("ships with at least two variants for A/B testing", () => {
    expect(PROMPT_VARIANTS.length).toBeGreaterThanOrEqual(2);
  });

  it("exposes the editorial baseline as v1 and the default", () => {
    expect(DEFAULT_PROMPT_VARIANT_ID).toBe("v1");
    expect(PROMPT_VARIANTS[0].id).toBe("v1");
  });

  it("includes the v2-tight alternate", () => {
    const v2 = PROMPT_VARIANTS.find((v) => v.id === "v2-tight");
    expect(v2).toBeDefined();
  });

  it("every variant has a label, description, and a non-negative weight", () => {
    // Weight 0 means "registered but not in the random A/B pool" (opt-in only,
    // e.g. v2-wish). Random arms of the A/B should still have weight > 0.
    for (const variant of PROMPT_VARIANTS) {
      expect(variant.label).toBeTruthy();
      expect(variant.description).toBeTruthy();
      expect(variant.weight).toBeGreaterThanOrEqual(0);
    }
  });

  it("listPromptVariants returns metadata without builder functions", () => {
    const list = listPromptVariants();
    expect(list).toHaveLength(PROMPT_VARIANTS.length);
    for (const meta of list) {
      expect(meta).not.toHaveProperty("buildReveal");
      expect(meta).not.toHaveProperty("buildScene");
      expect(meta.id).toBeTruthy();
    }
  });

  it("isKnownPromptVariant accepts known ids and rejects unknown", () => {
    expect(isKnownPromptVariant("v1")).toBe(true);
    expect(isKnownPromptVariant("v2-tight")).toBe(true);
    expect(isKnownPromptVariant("does-not-exist")).toBe(false);
    expect(isKnownPromptVariant(null)).toBe(false);
    expect(isKnownPromptVariant(undefined)).toBe(false);
  });

  it("getPromptVariant falls back to the default for unknown ids", () => {
    expect(getPromptVariant("ghost").id).toBe(DEFAULT_PROMPT_VARIANT_ID);
    expect(getPromptVariant(null).id).toBe(DEFAULT_PROMPT_VARIANT_ID);
    expect(getPromptVariant(undefined).id).toBe(DEFAULT_PROMPT_VARIANT_ID);
  });
});

describe("buildRevealPrompt with explicit variant", () => {
  it("v1 includes the soft mapping table", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en", "v1");
    expect(prompt.toLowerCase()).toContain("soft mapping hints");
  });

  it("v2-tight drops the soft mapping table", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en", "v2-tight");
    expect(prompt.toLowerCase()).not.toContain("soft mapping hints");
  });

  it("v1 and v2-tight produce different prompts for the same input", () => {
    const v1 = buildRevealPrompt(ANSWERS, "protagonist", "en", "v1");
    const v2 = buildRevealPrompt(ANSWERS, "protagonist", "en", "v2-tight");
    expect(v1).not.toBe(v2);
  });

  it("both variants still include all seven answers verbatim", () => {
    for (const id of ["v1", "v2-tight"]) {
      const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en", id);
      for (const answer of Object.values(ANSWERS)) {
        expect(prompt).toContain(answer);
      }
    }
  });

  it("unknown variant id transparently falls back to v1", () => {
    const v1 = buildRevealPrompt(ANSWERS, "protagonist", "en", "v1");
    const unknown = buildRevealPrompt(ANSWERS, "protagonist", "en", "ghost-variant");
    expect(unknown).toBe(v1);
  });

  it("omitting variant id is equivalent to v1", () => {
    const omitted = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const explicit = buildRevealPrompt(ANSWERS, "protagonist", "en", "v1");
    expect(omitted).toBe(explicit);
  });
});

describe("buildScenePrompt with explicit variant", () => {
  it("v1 and v2-tight both reference the character and pacing", () => {
    for (const id of ["v1", "v2-tight"]) {
      const prompt = buildScenePrompt(STATE, 1, "", "en", id);
      expect(prompt).toContain("Yuna");
      expect(prompt).toContain("Cryo");
      expect(prompt).toContain("<scene>");
      expect(prompt).toContain("<choices>");
      expect(prompt).toContain("<summary>");
      expect(prompt.toLowerCase()).toContain("closing");
    }
  });

  it("v1 and v2-tight produce different prompts for the same input", () => {
    const v1 = buildScenePrompt(STATE, 2, "follow the voice", "en", "v1");
    const v2 = buildScenePrompt(STATE, 2, "follow the voice", "en", "v2-tight");
    expect(v1).not.toBe(v2);
  });

  it("omitting variant id is equivalent to v1", () => {
    const omitted = buildScenePrompt(STATE, 1, "", "en");
    const explicit = buildScenePrompt(STATE, 1, "", "en", "v1");
    expect(omitted).toBe(explicit);
  });
});
