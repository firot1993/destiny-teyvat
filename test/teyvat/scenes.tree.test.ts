// test/teyvat/scenes.tree.test.ts
import { describe, expect, it } from "vitest";
import { activeScenesOf, withSceneAppended, type AdventureState } from "@/lib/teyvat/scenes";
import { createTree } from "@/lib/teyvat/sceneTree";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const stubChar = {
  framing: "protagonist", name: "X", title: "—", vision: "Anemo",
  nation: "Mondstadt", weapon: "Catalyst", archetype: "—", bio: "—",
  visionStory: "—", constellation: "—", signature: "—", knownAssociate: "",
  awakeningHook: "—",
} as unknown as RevealedCharacter;

describe("activeScenesOf / withSceneAppended", () => {
  it("returns the active path scenes in legacy Scene[] shape", () => {
    const tree = createTree({
      id: "n1", parentId: null, depth: 1, choiceTaken: null,
      prose: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "",
    });
    const state: AdventureState = {
      id: "adv1", character: stubChar, tree, ended: false, endedBy: null,
      startedAt: "2026-05-09T00:00:00Z",
    };
    const scenes = activeScenesOf(state);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].text).toBe("P1");
  });

  it("withSceneAppended adds a new scene to the active leaf", () => {
    const tree = createTree({
      id: "n1", parentId: null, depth: 1, choiceTaken: null,
      prose: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "",
    });
    const state: AdventureState = {
      id: "adv1", character: stubChar, tree, ended: false, endedBy: null,
      startedAt: "2026-05-09T00:00:00Z",
    };
    const next = withSceneAppended(state, "n2", "a", {
      sceneNumber: 2, text: "P2", choices: ["x","y"], closing: false, summary: "s2", fromChoice: "a",
    });
    expect(next.tree.activePath).toEqual(["n1", "n2"]);
    expect(activeScenesOf(next).map((s) => s.sceneNumber)).toEqual([1, 2]);
  });
});
