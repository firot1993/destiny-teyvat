import { describe, expect, it } from "vitest";
import { getPromptVariant } from "@/lib/teyvat/promptVariants";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";
import type { AdventureState } from "@/lib/teyvat/scenes";

function makeState(overrides: Partial<AdventureState["character"]> = {}, scenes: AdventureState["scenes"] = []): AdventureState {
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
    scenes,
    ended: false,
    endedBy: null,
    startedAt: new Date().toISOString(),
    variantId: "v2-wish",
  };
}

describe("v2-wish variant", () => {
  const v = getPromptVariant("v2-wish");

  it("is registered with id 'v2-wish'", () => {
    expect(v.id).toBe("v2-wish");
  });

  it("uses the wish questionnaire and candidates reveal contract", () => {
    expect(v.capabilities.questionnaire).toBe(wishQuestionnaire);
    expect(v.capabilities.reveal).toEqual({ kind: "candidates", min: 3, max: 5 });
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
});
