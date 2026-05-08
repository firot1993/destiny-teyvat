import { describe, expect, it } from "vitest";
import { getPromptVariant } from "@/lib/teyvat/promptVariants";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";
import type { AdventureState, Scene, StoryDirection } from "@/lib/teyvat/scenes";
import { createTree, appendChild } from "@/lib/teyvat/sceneTree";

function makeState(
  overrides: Partial<AdventureState["character"]> = {},
  scenes: Scene[] = [],
  storyDirection: StoryDirection | null = null
): AdventureState {
  // Build a single-path tree from the given scenes (mirrors storage migration)
  let tree = createTree({
    id: "root",
    parentId: null,
    depth: 1,
    choiceTaken: null,
    prose: scenes[0]?.text ?? "",
    choices: scenes[0]?.choices ?? [],
    closing: scenes[0]?.closing ?? false,
    summary: scenes[0]?.summary ?? "",
    fromChoice: scenes[0]?.fromChoice ?? "",
  });
  for (let i = 1; i < scenes.length; i++) {
    const s = scenes[i];
    tree = appendChild(tree, {
      id: `n${i + 1}`,
      parentId: tree.activePath[tree.activePath.length - 1],
      depth: i + 1,
      choiceTaken: s.fromChoice || null,
      prose: s.text,
      choices: s.choices,
      closing: s.closing,
      summary: s.summary,
      fromChoice: s.fromChoice,
    });
  }
  return {
    id: "x",
    character: {
      framing: "protagonist",
      name: "Raiden Shogun",
      title: "—",
      vision: "Electro",
      nation: "Inazuma",
      weapon: "polearm",
      archetype: "Electro Archon",
      bio: "—",
      visionStory: "—",
      constellation: "—",
      signature: "—",
      knownAssociate: "",
      ...overrides,
    },
    tree,
    committed: scenes.length > 0,
    ended: false,
    endedBy: null,
    startedAt: new Date().toISOString(),
    variantId: "v2-wish",
    storyDirection,
  };
}

describe("v2-wish variant", () => {
  const v = getPromptVariant("v2-wish");

  it("is registered with id 'v2-wish'", () => {
    expect(v.id).toBe("v2-wish");
  });

  it("uses the wish questionnaire and fated-with-directions reveal contract", () => {
    expect(v.capabilities.questionnaire).toBe(wishQuestionnaire);
    expect(v.capabilities.reveal).toEqual({ kind: "fated-with-directions", count: 3 });
    expect(v.capabilities.framing).toBe("transmigration");
    expect(v.capabilities.sceneTone).toBe("wish-fulfillment");
  });

  it("buildScene incorporates awakeningHook on scene 1", () => {
    const state = makeState({ awakeningHook: "you wake at the top of Tenshukaku..." });
    const prompt = v.buildScene(state, 1, "", "en");
    expect(prompt).toContain("you wake at the top of Tenshukaku");
  });

  it("buildScene does not duplicate awakeningHook on scenes after 1", () => {
    const state = makeState(
      { awakeningHook: "UNIQUE_AWAKENING_TOKEN" },
      [{ sceneNumber: 1, text: "x", choices: ["a", "b", "c"], closing: false, summary: "s", fromChoice: "" }]
    );
    const prompt = v.buildScene(state, 2, "a", "en");
    expect(prompt).not.toContain("UNIQUE_AWAKENING_TOKEN");
  });

  it("buildScene anchors every scene on the picked storyDirection", () => {
    const direction: StoryDirection = {
      id: "revenge",
      title: "Lightning Repays in Kind",
      hook: "you wake on a balcony — the ones who scorned you are still in the courtyard below.",
    };
    const scene1Prompt = v.buildScene(makeState({}, [], direction), 1, "", "en");
    expect(scene1Prompt).toContain("Lightning Repays in Kind");
    expect(scene1Prompt).toContain("revenge");

    const scene3Prompt = v.buildScene(
      makeState(
        {},
        [
          { sceneNumber: 1, text: "x", choices: ["a", "b", "c"], closing: false, summary: "s1", fromChoice: "" },
          { sceneNumber: 2, text: "x", choices: ["a", "b", "c"], closing: false, summary: "s2", fromChoice: "a" },
        ],
        direction
      ),
      3,
      "b",
      "en"
    );
    // Direction title and id must persist across all scenes
    expect(scene3Prompt).toContain("Lightning Repays in Kind");
    expect(scene3Prompt).toContain("revenge");
  });

  it("buildScene works when storyDirection is null (legacy library entries)", () => {
    const state = makeState({}, [], null);
    expect(() => v.buildScene(state, 1, "", "en")).not.toThrow();
  });
});
