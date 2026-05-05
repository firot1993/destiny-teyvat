import { describe, expect, it } from "vitest";
import { CANON_NAMES, matchesCanonName } from "@/lib/teyvat/canonNames";

describe("CANON_NAMES", () => {
  it("contains a meaningful number of entries in both languages", () => {
    expect(CANON_NAMES.length).toBeGreaterThan(100);
    expect(CANON_NAMES.some((n) => /[一-鿿]/.test(n))).toBe(true);
    expect(CANON_NAMES.some((n) => /^[A-Za-z]/.test(n))).toBe(true);
  });
});

describe("matchesCanonName", () => {
  it("returns null for an invented name", () => {
    expect(matchesCanonName("Yuna")).toBeNull();
    expect(matchesCanonName("霜见")).toBeNull();
  });

  it("matches an exact canon name (English)", () => {
    expect(matchesCanonName("Furina")).toBe("Furina");
  });

  it("matches an exact canon name (Chinese)", () => {
    expect(matchesCanonName("神里绫华")).toBe("神里绫华");
  });

  it("is case-insensitive for English", () => {
    expect(matchesCanonName("furina")).toBe("Furina");
    expect(matchesCanonName("FURINA")).toBe("Furina");
  });

  it("matches when the generated name is a substring of a canon name (Chinese)", () => {
    expect(matchesCanonName("绫华")).toBe("神里绫华");
  });

  it("matches when a canon family name is contained in the generated name (Chinese)", () => {
    expect(matchesCanonName("神里小百合")).toBe("神里绫华");
  });

  it("uses word boundaries for English to avoid false positives", () => {
    expect(matchesCanonName("Eulalia")).toBeNull();
    expect(matchesCanonName("Klee")).toBe("Klee");
  });

  it("matches a canon English short form embedded as a word", () => {
    expect(matchesCanonName("Lady Furina of the Court")).toBe("Furina");
  });

  it("returns null for empty input", () => {
    expect(matchesCanonName("")).toBeNull();
    expect(matchesCanonName("   ")).toBeNull();
  });
});
