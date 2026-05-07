import { describe, expect, it } from "vitest";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";

describe("wishQuestionnaire", () => {
  it("has id 'wish'", () => {
    expect(wishQuestionnaire.id).toBe("wish");
  });

  it("declares three chapters in order: origin, power, desireWish", () => {
    expect(wishQuestionnaire.chapters).toEqual(["origin", "power", "desireWish"]);
  });

  it("contains exactly seven steps", () => {
    expect(wishQuestionnaire.steps).toHaveLength(7);
  });

  it("all step ids are unique", () => {
    const ids = wishQuestionnaire.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every step is single-select with at least 4 options", () => {
    for (const step of wishQuestionnaire.steps) {
      expect(step.mode).toBe("single");
      expect(step.options.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("every option has both en and zh labels", () => {
    for (const step of wishQuestionnaire.steps) {
      for (const o of step.options) {
        expect(o.label.en.trim()).not.toBe("");
        expect(o.label.zh.trim()).not.toBe("");
      }
    }
  });

  it("includes the seven affinity options for q7", () => {
    const affinity = wishQuestionnaire.steps.find((s) => s.id === "affinity");
    expect(affinity).toBeDefined();
    expect(affinity!.options).toHaveLength(7);
  });
});
