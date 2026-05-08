import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  archiveToLibrary,
  loadAdventure,
  loadLibrary,
  saveAdventure,
} from "@/lib/teyvat/storage";
import type { AdventureState } from "@/lib/teyvat/scenes";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import { createTree } from "@/lib/teyvat/sceneTree";

const baseCharacter: RevealedCharacter = {
  framing: "protagonist",
  name: "Test",
  title: "The Tester",
  vision: "Electro",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "tester",
  bio: "a bio",
  visionStory: "a story",
  constellation: "starry words",
  signature: "test signature",
  knownAssociate: "",
};

const emptyTree = createTree({
  id: "root", parentId: null, depth: 1, choiceTaken: null,
  prose: "", choices: [], closing: false, summary: "", fromChoice: "",
});

function makeAdventure(overrides: Partial<AdventureState> = {}): AdventureState {
  return {
    id: "test-1",
    character: baseCharacter,
    tree: emptyTree,
    ended: false,
    endedBy: null,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("storage — variantId round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("persists variantId on the active adventure", () => {
    const state = makeAdventure({ variantId: "v2-wish" });
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.variantId).toBe("v2-wish");
  });

  it("treats missing variantId as undefined (legacy runs)", () => {
    const state = makeAdventure();
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.variantId).toBeUndefined();
  });

  it("persists variantId across archiveToLibrary", () => {
    const state = makeAdventure({ id: "lib-1", variantId: "v1", ended: true });
    archiveToLibrary(state);
    const lib = loadLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].variantId).toBe("v1");
  });

  it("persists awakeningHook through storage", () => {
    const state = makeAdventure({
      character: { ...baseCharacter, awakeningHook: "you wake..." },
    });
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.character.awakeningHook).toBe("you wake...");
  });
});
