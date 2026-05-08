// test/teyvat/storage.migration.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADVENTURE_STORAGE_KEY } from "@/lib/constants";
import { loadAdventure } from "@/lib/teyvat/storage";

const legacyShape = {
  id: "legacy1",
  character: {
    framing: "protagonist", name: "Lirien", title: "of the seven winds",
    vision: "Anemo", nation: "Mondstadt", weapon: "catalyst",
    archetype: "scholar", bio: "—", visionStory: "—",
    constellation: "—", signature: "—", knownAssociate: "",
    awakeningHook: "—",
  },
  scenes: [
    { sceneNumber: 1, text: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "" },
    { sceneNumber: 2, text: "P2", choices: ["c","d"], closing: false, summary: "s2", fromChoice: "a" },
  ],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-08T00:00:00Z",
};

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe("loadAdventure() — legacy migration", () => {
  it("converts legacy scenes[] to a single-path SceneTree", () => {
    localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(legacyShape));
    const loaded = loadAdventure();
    expect(loaded).not.toBeNull();
    expect(loaded!.tree.activePath).toHaveLength(2);
    expect(loaded!.tree.nodes[loaded!.tree.activePath[0]].prose).toBe("P1");
    expect(loaded!.tree.nodes[loaded!.tree.activePath[1]].prose).toBe("P2");
    expect(loaded!.tree.nodes[loaded!.tree.activePath[1]].choiceTaken).toBe("a");
  });

  it("loads new tree-shape adventures unchanged", () => {
    const newShape = {
      ...legacyShape,
      tree: {
        rootId: "n1",
        nodes: {
          n1: { id: "n1", parentId: null, depth: 1, choiceTaken: null,
                prose: "P1", choices: [], closing: false, summary: "s1", fromChoice: "" },
        },
        activePath: ["n1"],
      },
    };
    delete (newShape as Partial<typeof newShape>).scenes;
    localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(newShape));
    const loaded = loadAdventure();
    expect(loaded!.tree.activePath).toEqual(["n1"]);
  });
});
