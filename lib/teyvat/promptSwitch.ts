import {
  DEFAULT_PROMPT_VARIANT_ID,
  PROMPT_VARIANTS,
  isKnownPromptVariant,
} from "@/lib/teyvat/promptVariants";

export const PROMPT_VARIANT_STORAGE_KEY = "destiny-prompt-variant";
export const PROMPT_VARIANT_QUERY_PARAM = "promptVariant";

function readQueryOverride(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(PROMPT_VARIANT_QUERY_PARAM);
    return isKnownPromptVariant(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredAssignment(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const value = localStorage.getItem(PROMPT_VARIANT_STORAGE_KEY);
    return isKnownPromptVariant(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredAssignment(id: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PROMPT_VARIANT_STORAGE_KEY, id);
  } catch {
    // Storage may be unavailable (private mode, quota). Silently no-op.
  }
}

function pickWeightedVariant(rng: () => number = Math.random): string {
  const totalWeight = PROMPT_VARIANTS.reduce(
    (sum, variant) => sum + Math.max(0, variant.weight),
    0
  );

  if (totalWeight <= 0) {
    return DEFAULT_PROMPT_VARIANT_ID;
  }

  let roll = rng() * totalWeight;
  for (const variant of PROMPT_VARIANTS) {
    const weight = Math.max(0, variant.weight);
    if (roll < weight) {
      return variant.id;
    }
    roll -= weight;
  }

  return PROMPT_VARIANTS[PROMPT_VARIANTS.length - 1].id;
}

export interface ResolveOptions {
  /** Inject a deterministic RNG for tests. Defaults to Math.random. */
  rng?: () => number;
  /** When true, do not persist a freshly-rolled assignment to storage. */
  ephemeral?: boolean;
}

/**
 * Resolve the active prompt variant.
 *
 * Precedence:
 *   1. ?promptVariant=<id> in window.location.search (debug override; not persisted)
 *   2. localStorage[destiny-prompt-variant] (sticky A/B assignment)
 *   3. Weighted random pick across PROMPT_VARIANTS, written back to storage so
 *      the same user lands on the same variant across sessions.
 *
 * Always returns a valid variant id. Safe to call on the server (returns the
 * default variant when window/localStorage are absent).
 */
export function resolvePromptVariant(options: ResolveOptions = {}): string {
  const queryOverride = readQueryOverride();
  if (queryOverride) {
    return queryOverride;
  }

  const stored = readStoredAssignment();
  if (stored) {
    return stored;
  }

  if (typeof window === "undefined") {
    return DEFAULT_PROMPT_VARIANT_ID;
  }

  const picked = pickWeightedVariant(options.rng);
  if (!options.ephemeral) {
    writeStoredAssignment(picked);
  }
  return picked;
}

/** Manually pin the variant for the current browser (debug picker). */
export function setPromptVariant(id: string): void {
  if (!isKnownPromptVariant(id)) {
    return;
  }
  writeStoredAssignment(id);
}

/** Drop the stored assignment so the next resolve re-rolls. */
export function clearPromptVariant(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(PROMPT_VARIANT_STORAGE_KEY);
  } catch {
    // Silent no-op.
  }
}
