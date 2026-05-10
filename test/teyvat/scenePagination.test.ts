import { describe, expect, it } from "vitest";
import {
  paginateSceneText,
  shouldAutoScrollAfterSceneUpdate,
} from "@/lib/teyvat/scenePagination";

describe("scene pagination", () => {
  it("keeps short scene text on one page", () => {
    expect(paginateSceneText("She crossed the threshold.")).toEqual([
      "She crossed the threshold.",
    ]);
  });

  it("splits long scene text into readable snap pages", () => {
    const paragraph = "The lanterns answered before anyone spoke. ".repeat(24).trim();
    const pages = paginateSceneText(`${paragraph}\n\n${paragraph}`);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages).toHaveLength(2);
    expect(pages.every((page) => page.length <= 1480)).toBe(true);
    expect(pages.join("\n\n")).toContain("The lanterns answered");
  });

  it("does not over-fragment a continuous prose passage", () => {
    const prose = "The note appeared beneath the atelier door sometime after the bell struck seven. ".repeat(32).trim();

    expect(paginateSceneText(prose)).toHaveLength(2);
  });

  it("scrolls only after scene generation finishes with a new scene", () => {
    expect(
      shouldAutoScrollAfterSceneUpdate({
        previousSceneCount: 0,
        currentSceneCount: 1,
        wasGeneratingScene: true,
        isGeneratingScene: false,
      })
    ).toBe(true);

    expect(
      shouldAutoScrollAfterSceneUpdate({
        previousSceneCount: 0,
        currentSceneCount: 1,
        wasGeneratingScene: false,
        isGeneratingScene: false,
      })
    ).toBe(false);

    expect(
      shouldAutoScrollAfterSceneUpdate({
        previousSceneCount: 1,
        currentSceneCount: 1,
        wasGeneratingScene: true,
        isGeneratingScene: false,
      })
    ).toBe(false);
  });
});
