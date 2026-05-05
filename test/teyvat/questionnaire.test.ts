import { describe, expect, it } from "vitest";
import {
  CHAPTER_META,
  TEYVAT_STEPS,
  isComplete,
  type TeyvatAnswers,
  type TeyvatStep,
} from "@/lib/teyvat/questionnaire";

describe("Teyvat questionnaire", () => {
  it("has exactly 7 questions across 3 chapters", () => {
    expect(TEYVAT_STEPS.length).toBe(7);
    const chapters = new Set(TEYVAT_STEPS.map((step) => step.chapter));
    expect(chapters).toEqual(new Set(["mood", "desire", "conflict"]));
  });

  it("provides English and Chinese chapter metadata", () => {
    expect(CHAPTER_META.mood.title.en).toBeTruthy();
    expect(CHAPTER_META.mood.title.zh).toBeTruthy();
    expect(CHAPTER_META.desire.title.en).toBeTruthy();
    expect(CHAPTER_META.conflict.title.en).toBeTruthy();
  });

  it("every step is single-select with 4 options", () => {
    for (const step of TEYVAT_STEPS) {
      expect(step.mode).toBe("single");
      expect(step.options).toHaveLength(4);
      expect(step.options.every((option) => option.value.length > 0)).toBe(true);
    }
  });

  it("has unique step ids", () => {
    const ids = TEYVAT_STEPS.map((step: TeyvatStep) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("isComplete is true only when every step has an answer", () => {
    const partial: TeyvatAnswers = {
      [TEYVAT_STEPS[0].id]: TEYVAT_STEPS[0].options[0].value,
    };
    const full = Object.fromEntries(
      TEYVAT_STEPS.map((step) => [step.id, step.options[0].value])
    ) as TeyvatAnswers;

    expect(isComplete(partial)).toBe(false);
    expect(isComplete(full)).toBe(true);
  });
});