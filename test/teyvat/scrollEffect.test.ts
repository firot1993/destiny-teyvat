import { describe, expect, it } from "vitest";
import { advanceStoryScrollProgress, computeStoryScrollEffect } from "@/lib/teyvat/scrollEffect";

describe("computeStoryScrollEffect", () => {
  it("starts misted and unresolved at the top of the story", () => {
    const metrics = computeStoryScrollEffect({
      scrollTop: 0,
      scrollHeight: 3000,
      clientHeight: 1000,
    });

    expect(metrics.progress).toBe(0);
    expect(metrics.focus).toBeCloseTo(0.18);
    expect(metrics.blurPx).toBeCloseTo(3.2);
    expect(metrics.mistOpacity).toBeCloseTo(0.24);
  });

  it("sharpens the world as scroll progress advances", () => {
    const early = computeStoryScrollEffect({
      scrollTop: 250,
      scrollHeight: 3000,
      clientHeight: 1000,
    });
    const later = computeStoryScrollEffect({
      scrollTop: 1750,
      scrollHeight: 3000,
      clientHeight: 1000,
    });

    expect(later.progress).toBeGreaterThan(early.progress);
    expect(later.focus).toBeGreaterThan(early.focus);
    expect(later.blurPx).toBeLessThan(early.blurPx);
    expect(later.mistOpacity).toBeLessThan(early.mistOpacity);
  });

  it("moves the ambient color through a night-sky range", () => {
    const opening = computeStoryScrollEffect({
      scrollTop: 0,
      scrollHeight: 3000,
      clientHeight: 1000,
    });
    const ending = computeStoryScrollEffect({
      scrollTop: 2000,
      scrollHeight: 3000,
      clientHeight: 1000,
    });

    expect(opening.ambientColor).toBe("rgb(18, 29, 54)");
    expect(ending.ambientColor).toBe("rgb(20, 33, 61)");
    expect(ending.ambientOpacity).toBeGreaterThan(opening.ambientOpacity);
  });

  it("maps a falling-star field from the first page to the last page", () => {
    const opening = computeStoryScrollEffect({
      scrollTop: 0,
      scrollHeight: 3000,
      clientHeight: 1000,
    });
    const middle = computeStoryScrollEffect({
      scrollTop: 1000,
      scrollHeight: 3000,
      clientHeight: 1000,
    });
    const ending = computeStoryScrollEffect({
      scrollTop: 2000,
      scrollHeight: 3000,
      clientHeight: 1000,
    });

    expect(opening.fallingStarYvh).toBeCloseTo(9);
    expect(middle.fallingStarYvh).toBeGreaterThan(opening.fallingStarYvh);
    expect(ending.fallingStarYvh).toBeCloseTo(90);
    expect(ending.fallingStarXvw).toBeLessThan(opening.fallingStarXvw);
    expect(opening.fallingStars).toHaveLength(6);
    expect(ending.fallingStars).toHaveLength(6);
    expect(ending.fallingStars.every((star) => star.yvh > opening.fallingStars[0].yvh)).toBe(true);
  });

  it("handles non-scrollable documents without invalid CSS values", () => {
    const metrics = computeStoryScrollEffect({
      scrollTop: 0,
      scrollHeight: 800,
      clientHeight: 1000,
    });

    expect(metrics.progress).toBe(0);
    expect(metrics.focus).toBeCloseTo(0.18);
    expect(metrics.blurPx).toBeGreaterThan(0);
    expect(metrics.threadScale).toBeCloseTo(0.04);
    expect(metrics.fallingStarYvh).toBeCloseTo(9);
  });

  it("eases large downward scroll jumps instead of snapping the overlay to the target", () => {
    const next = advanceStoryScrollProgress({
      currentProgress: 0.1,
      targetProgress: 0.82,
      deltaMs: 16,
    });

    expect(next).toBeGreaterThan(0.1);
    expect(next).toBeLessThan(0.14);
  });

  it("still settles near the target after sustained animation frames", () => {
    let progress = 0.1;

    for (let frame = 0; frame < 120; frame += 1) {
      progress = advanceStoryScrollProgress({
        currentProgress: progress,
        targetProgress: 0.82,
        deltaMs: 16,
      });
    }

    expect(progress).toBeGreaterThan(0.76);
    expect(progress).toBeLessThanOrEqual(0.82);
  });
});
