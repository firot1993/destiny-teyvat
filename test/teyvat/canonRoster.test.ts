import { describe, expect, it } from "vitest";
import { CANON_ROSTER, getCanonCharacter } from "@/lib/teyvat/canonRoster";
import { VISIONS, NATIONS, WEAPONS } from "@/lib/teyvat/elements";

describe("canon roster", () => {
  it("has between 20 and 30 entries", () => {
    expect(CANON_ROSTER.length).toBeGreaterThanOrEqual(20);
    expect(CANON_ROSTER.length).toBeLessThanOrEqual(30);
  });

  it("every id is unique", () => {
    const ids = CANON_ROSTER.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all seven Visions at least once", () => {
    const visions = new Set(CANON_ROSTER.map((c) => c.vision));
    for (const v of VISIONS) {
      expect(visions.has(v)).toBe(true);
    }
  });

  it("every entry has valid vision/nation/weapon enums", () => {
    for (const c of CANON_ROSTER) {
      expect(VISIONS).toContain(c.vision);
      expect(NATIONS).toContain(c.nation);
      expect(WEAPONS).toContain(c.weapon);
    }
  });

  it("every entry has en + zh names and non-empty blurbs", () => {
    for (const c of CANON_ROSTER) {
      expect(c.nameEn.trim()).not.toBe("");
      expect(c.nameZh.trim()).not.toBe("");
      expect(c.archetypeBlurb.en.trim()).not.toBe("");
      expect(c.archetypeBlurb.zh.trim()).not.toBe("");
      expect(c.bioBlurb.en.trim()).not.toBe("");
      expect(c.bioBlurb.zh.trim()).not.toBe("");
    }
  });

  it("every entry has at least one tag in each powerFantasyAxes field", () => {
    for (const c of CANON_ROSTER) {
      expect(c.powerFantasyAxes.dominance.length).toBeGreaterThan(0);
      expect(c.powerFantasyAxes.pace.length).toBeGreaterThan(0);
      expect(c.powerFantasyAxes.humbleTargets.length).toBeGreaterThan(0);
      expect(c.powerFantasyAxes.rewards.length).toBeGreaterThan(0);
    }
  });

  it("getCanonCharacter looks up by id", () => {
    const first = CANON_ROSTER[0];
    expect(getCanonCharacter(first.id)).toBe(first);
    expect(getCanonCharacter("does-not-exist")).toBeNull();
  });
});
