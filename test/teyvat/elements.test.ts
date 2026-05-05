import { describe, expect, it } from "vitest";
import {
  ELEMENT_PALETTE,
  NATIONS,
  VISIONS,
  WEAPONS,
  isNation,
  isVision,
  isWeapon,
} from "@/lib/teyvat/elements";

describe("Teyvat enums", () => {
  it("lists the seven visions", () => {
    expect(VISIONS).toEqual([
      "Anemo",
      "Geo",
      "Electro",
      "Dendro",
      "Hydro",
      "Pyro",
      "Cryo",
    ]);
  });

  it("includes wandering as a valid nation", () => {
    expect(NATIONS).toContain("wandering");
    expect(NATIONS).toContain("Snezhnaya");
  });

  it("lists the five weapon types", () => {
    expect(WEAPONS).toEqual([
      "sword",
      "claymore",
      "polearm",
      "bow",
      "catalyst",
    ]);
  });

  it("provides a palette entry for every vision", () => {
    for (const vision of VISIONS) {
      expect(ELEMENT_PALETTE[vision]).toBeDefined();
      expect(ELEMENT_PALETTE[vision].accent).toBeTruthy();
    }
  });

  it("rejects unknown values via type guards", () => {
    expect(isVision("Anemo")).toBe(true);
    expect(isVision("Light")).toBe(false);
    expect(isNation("Fontaine")).toBe(true);
    expect(isNation("Celestia")).toBe(false);
    expect(isWeapon("bow")).toBe(true);
    expect(isWeapon("axe")).toBe(false);
  });
});