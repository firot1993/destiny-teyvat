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
    expect(p.ground).toContain("#08111f");
    expect(p.ground).toContain("radial-gradient");
    expect(p.ink).toBe("#f5e8c8");
    expect(p.inkSoft).toBe("#d8c99f");
    expect(p.accent).toBe("#74c2a4"); // anemo
  });

  it("returns a night-sky atmospheric palette", () => {
    const p = paletteFor("atmospheric", "Hydro");
    expect(p.ground).toContain("#050914");
    expect(p.ground).toContain("radial-gradient");
    expect(p.ink).toBe("#f8edcf");
    expect(p.accent).toBe("#3d92e1");
  });

  it("keeps adjacent story tiers on the same continuous night sky", () => {
    const atmospheric = paletteFor("atmospheric", "Anemo");
    const reading = paletteFor("reading", "Anemo");

    expect(reading.ground).toBe(atmospheric.ground);
  });

  it("returns Pyro-tinted theatrical palette", () => {
    const p = paletteFor("theatrical", "Pyro");
    expect(p.silhouette).toBeTruthy();
    expect(p.accent).toBe("#ed5a3a"); // pyro
  });
});
