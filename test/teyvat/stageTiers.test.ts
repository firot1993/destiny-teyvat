// test/teyvat/stageTiers.test.ts
import { describe, expect, it } from "vitest";
import { tierFor, paletteFor, type StageTier } from "@/lib/teyvat/stageTiers";

describe("tierFor", () => {
  it("maps stage kinds to tiers", () => {
    expect(tierFor("title")).toBe<StageTier>("atmospheric");
    expect(tierFor("chapter-intro")).toBe<StageTier>("atmospheric");
    expect(tierFor("question")).toBe<StageTier>("reading");
    expect(tierFor("reveal")).toBe<StageTier>("theatrical");
    expect(tierFor("scene")).toBe<StageTier>("reading");
    expect(tierFor("ending")).toBe<StageTier>("atmospheric");
  });
});

describe("paletteFor", () => {
  it("returns Anemo-tinted reading palette", () => {
    const p = paletteFor("reading", "Anemo");
    expect(p.ground).toMatch(/#/);
    expect(p.ink).toBe("#1a1612");
    expect(p.accent).toBe("#74c2a4"); // anemo
  });

  it("returns Pyro-tinted theatrical palette", () => {
    const p = paletteFor("theatrical", "Pyro");
    expect(p.silhouette).toBeTruthy();
    expect(p.accent).toBe("#ed5a3a"); // pyro
  });
});
