import { describe, expect, it } from "vitest";
import { PROMPT_VARIANTS, getPromptVariant } from "@/lib/teyvat/promptVariants";
import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

describe("PromptVariant capabilities", () => {
  it("every registered variant declares capabilities", () => {
    for (const v of PROMPT_VARIANTS) {
      expect(v.capabilities).toBeDefined();
      expect(v.capabilities.questionnaire).toBeDefined();
      expect(v.capabilities.reveal).toBeDefined();
    }
  });

  it("v1 uses the editorial questionnaire and single-reveal contract", () => {
    const v1 = getPromptVariant("v1");
    expect(v1.capabilities.questionnaire).toBe(editorialQuestionnaire);
    expect(v1.capabilities.reveal.kind).toBe("single");
  });

  it("v2-tight uses the editorial questionnaire and single-reveal contract", () => {
    const v = getPromptVariant("v2-tight");
    expect(v.capabilities.questionnaire).toBe(editorialQuestionnaire);
    expect(v.capabilities.reveal.kind).toBe("single");
  });
});
