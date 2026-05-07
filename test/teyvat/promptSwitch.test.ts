import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROMPT_VARIANT_QUERY_PARAM,
  PROMPT_VARIANT_STORAGE_KEY,
  clearPromptVariant,
  resolvePromptVariant,
  setPromptVariant,
} from "@/lib/teyvat/promptSwitch";
import { DEFAULT_PROMPT_VARIANT_ID, PROMPT_VARIANTS } from "@/lib/teyvat/promptVariants";

function setLocationSearch(search: string): void {
  const next = new URL(window.location.href);
  next.search = search;
  window.history.replaceState({}, "", next.toString());
}

beforeEach(() => {
  localStorage.clear();
  setLocationSearch("");
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  setLocationSearch("");
  vi.restoreAllMocks();
});

describe("resolvePromptVariant", () => {
  it("returns the URL override when set to a known variant", () => {
    setLocationSearch(`?${PROMPT_VARIANT_QUERY_PARAM}=v2-tight`);
    expect(resolvePromptVariant()).toBe("v2-tight");
  });

  it("ignores an unknown URL override", () => {
    setLocationSearch(`?${PROMPT_VARIANT_QUERY_PARAM}=ghost`);
    expect(resolvePromptVariant({ rng: () => 0 })).toBe(PROMPT_VARIANTS[0].id);
  });

  it("URL override does not persist to localStorage", () => {
    setLocationSearch(`?${PROMPT_VARIANT_QUERY_PARAM}=v2-tight`);
    resolvePromptVariant();
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
  });

  it("uses localStorage when no URL override is present", () => {
    localStorage.setItem(PROMPT_VARIANT_STORAGE_KEY, "v2-tight");
    expect(resolvePromptVariant()).toBe("v2-tight");
  });

  it("URL override beats localStorage", () => {
    localStorage.setItem(PROMPT_VARIANT_STORAGE_KEY, "v1");
    setLocationSearch(`?${PROMPT_VARIANT_QUERY_PARAM}=v2-tight`);
    expect(resolvePromptVariant()).toBe("v2-tight");
  });

  it("ignores invalid stored ids and re-rolls", () => {
    localStorage.setItem(PROMPT_VARIANT_STORAGE_KEY, "stale-variant");
    const id = resolvePromptVariant({ rng: () => 0 });
    expect(id).toBe(PROMPT_VARIANTS[0].id);
  });

  it("rolls a weighted assignment and persists it when nothing is stored", () => {
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
    const id = resolvePromptVariant({ rng: () => 0.99 });
    expect(id).toBe(PROMPT_VARIANTS[PROMPT_VARIANTS.length - 1].id);
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBe(id);
  });

  it("a freshly-rolled assignment is sticky across calls", () => {
    const first = resolvePromptVariant({ rng: () => 0 });
    expect(first).toBe(PROMPT_VARIANTS[0].id);
    const second = resolvePromptVariant({ rng: () => 0.99 });
    expect(second).toBe(first);
  });

  it("ephemeral=true does not write to storage", () => {
    const id = resolvePromptVariant({ rng: () => 0, ephemeral: true });
    expect(id).toBe(PROMPT_VARIANTS[0].id);
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
  });

  it("rolls all known variants with the right boundaries (uniform weights)", () => {
    // With two variants of weight 1 each, rng=0 hits the first, rng=0.99 hits the second.
    localStorage.clear();
    expect(resolvePromptVariant({ rng: () => 0, ephemeral: true })).toBe(PROMPT_VARIANTS[0].id);
    localStorage.clear();
    expect(resolvePromptVariant({ rng: () => 0.99, ephemeral: true })).toBe(
      PROMPT_VARIANTS[PROMPT_VARIANTS.length - 1].id
    );
  });
});

describe("setPromptVariant / clearPromptVariant", () => {
  it("setPromptVariant pins the assignment", () => {
    setPromptVariant("v2-tight");
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBe("v2-tight");
    expect(resolvePromptVariant()).toBe("v2-tight");
  });

  it("setPromptVariant ignores unknown ids", () => {
    setPromptVariant("ghost-variant");
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
  });

  it("clearPromptVariant removes the stored assignment", () => {
    setPromptVariant("v2-tight");
    clearPromptVariant();
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
  });

  it("after clearing, the next resolve re-rolls and persists", () => {
    setPromptVariant("v2-tight");
    clearPromptVariant();
    const id = resolvePromptVariant({ rng: () => 0 });
    expect(id).toBe(PROMPT_VARIANTS[0].id);
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBe(id);
  });
});

describe("default fallback when neither URL nor storage is available", () => {
  it("returns the default id when localStorage has nothing and rng returns 0", () => {
    expect(localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY)).toBeNull();
    expect(resolvePromptVariant({ rng: () => 0, ephemeral: true })).toBe(
      DEFAULT_PROMPT_VARIANT_ID
    );
  });
});
