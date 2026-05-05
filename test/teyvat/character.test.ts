import { describe, expect, it } from "vitest";
import {
  validateRevealedCharacter,
  type RevealedCharacter,
} from "@/lib/teyvat/character";

const VALID: RevealedCharacter = {
  framing: "protagonist",
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads of Inazuma. Her maps have outlived three rulers. She owes no one a destination.",
  visionStory:
    "She was sketching the cliffs at Yashiori when the wave came. Holding the line of one stranger's pulse against the cold, she felt the ice answer, small and exact. The Vision settled into her palm before the storm broke.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "",
};

describe("validateRevealedCharacter", () => {
  it("accepts a fully-formed protagonist", () => {
    const result = validateRevealedCharacter(VALID);
    expect(result.ok).toBe(true);
  });

  it("requires knownAssociate when framing is companion", () => {
    const result = validateRevealedCharacter({
      ...VALID,
      framing: "companion",
      knownAssociate: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/knownAssociate/i);
    }
  });

  it("rejects unknown vision", () => {
    const result = validateRevealedCharacter({ ...VALID, vision: "Light" as never });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown weapon", () => {
    const result = validateRevealedCharacter({ ...VALID, weapon: "axe" as never });
    expect(result.ok).toBe(false);
  });

  it("rejects empty visionStory", () => {
    const result = validateRevealedCharacter({ ...VALID, visionStory: "" });
    expect(result.ok).toBe(false);
  });
});