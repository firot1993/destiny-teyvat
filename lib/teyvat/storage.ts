import {
  ADVENTURE_STORAGE_KEY,
  LAST_ANSWERS_STORAGE_KEY,
  LAST_FATED_STORAGE_KEY,
  LAST_REVEAL_STORAGE_KEY,
  LIBRARY_STORAGE_KEY,
} from "@/lib/constants";
import { validateRevealedCharacter, type Framing, type RevealedCharacter } from "@/lib/teyvat/character";
import type { ParsedDirection } from "@/lib/teyvat/candidates";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import { type AdventureState } from "@/lib/teyvat/scenes";
import { createTree, appendChild } from "@/lib/teyvat/sceneTree";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

/* ---------- Legacy migration helpers ---------- */

interface LegacyScene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;
}

interface LegacyAdventure {
  id: string;
  character: unknown;
  scenes: LegacyScene[];
  ended: boolean;
  endedBy: "model" | "user" | null;
  startedAt: string;
  variantId?: string;
  revealReason?: string;
  storyDirection?: unknown;
}

function isLegacy(value: unknown): value is LegacyAdventure {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { scenes?: unknown; tree?: unknown };
  return Array.isArray(v.scenes) && v.tree === undefined;
}

function migrateLegacy(legacy: LegacyAdventure): AdventureState {
  // Build a single-path tree from legacy scenes.
  let tree = createTree({
    id: `n1-${legacy.id}`,
    parentId: null,
    depth: 1,
    choiceTaken: null,
    prose: legacy.scenes[0]?.text ?? "",
    choices: legacy.scenes[0]?.choices ?? [],
    closing: legacy.scenes[0]?.closing ?? false,
    summary: legacy.scenes[0]?.summary ?? "",
    fromChoice: legacy.scenes[0]?.fromChoice ?? "",
  });
  for (let i = 1; i < legacy.scenes.length; i++) {
    const s = legacy.scenes[i];
    tree = appendChild(tree, {
      id: `n${i + 1}-${legacy.id}`,
      parentId: tree.activePath[tree.activePath.length - 1],
      depth: i + 1,
      choiceTaken: s.fromChoice || null,
      prose: s.text,
      choices: s.choices,
      closing: s.closing,
      summary: s.summary,
      fromChoice: s.fromChoice,
    });
  }
  return {
    id: legacy.id,
    character: legacy.character as AdventureState["character"],
    tree,
    ended: legacy.ended,
    endedBy: legacy.endedBy,
    startedAt: legacy.startedAt,
    variantId: legacy.variantId,
    revealReason: legacy.revealReason,
    storyDirection: legacy.storyDirection as AdventureState["storyDirection"],
    committed: legacy.scenes.length > 0,
  };
}

function hasValidTreeShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { tree?: unknown; character?: unknown; ended?: unknown; startedAt?: unknown };
  if (typeof v.tree !== "object" || v.tree === null) return false;
  const t = v.tree as { rootId?: unknown; nodes?: unknown; activePath?: unknown };
  if (typeof t.rootId !== "string" || typeof t.nodes !== "object" || !Array.isArray(t.activePath)) return false;
  const characterCheck = validateRevealedCharacter(v.character);
  return characterCheck.ok && typeof v.ended === "boolean" && typeof v.startedAt === "string";
}

/* ---------- Current adventure (single in-progress slot) ---------- */

export function saveAdventure(state: AdventureState): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state));
}

export function loadAdventure(): AdventureState | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isLegacy(parsed)) return migrateLegacy(parsed);
    if (hasValidTreeShape(parsed)) return parsed as AdventureState;
    return null;
  } catch {
    return null;
  }
}

export function clearAdventure(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(ADVENTURE_STORAGE_KEY);
}

/* ---------- Adventure library (persistent bookshelf) ---------- */

export function loadLibrary(): AdventureState[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return (parsed as unknown[]).flatMap((entry) => {
      if (isLegacy(entry)) return [migrateLegacy(entry)];
      if (hasValidTreeShape(entry)) return [entry as AdventureState];
      return [];
    });
  } catch {
    return [];
  }
}

function saveLibrary(library: AdventureState[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

export function archiveToLibrary(state: AdventureState): void {
  const library = loadLibrary();
  const idx = library.findIndex((entry) => entry.id === state.id);
  if (idx >= 0) {
    library[idx] = state;
  } else {
    library.unshift(state);
  }
  saveLibrary(library);
}

export function removeFromLibrary(id: string): void {
  const library = loadLibrary();
  saveLibrary(library.filter((entry) => entry.id !== id));
}

/* ---------- Back-nav cache (last answers + last reveal/fated) ---------- */

/**
 * Stable hash of a TeyvatAnswers map. Hashes by sorted-key JSON so that
 * { a: 1, b: 2 } and { b: 2, a: 1 } produce the same digest. This is the
 * cache key for "did the user actually change their answers" — exact
 * equality is sufficient; collisions don't matter at this volume.
 */
export function hashAnswers(answers: TeyvatAnswers): string {
  const keys = Object.keys(answers).sort();
  const normalized = keys.map((k) => [k, answers[k]] as const);
  const json = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function saveLastAnswers(answers: TeyvatAnswers): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_ANSWERS_STORAGE_KEY, JSON.stringify(answers));
}

export function loadLastAnswers(): TeyvatAnswers | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LAST_ANSWERS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as TeyvatAnswers;
  } catch {
    return null;
  }
}

export function clearLastAnswers(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LAST_ANSWERS_STORAGE_KEY);
}

export interface CachedReveal {
  answersHash: string;
  variantId: string;
  framing: Framing;
  character: RevealedCharacter;
  imageUrl: string | null;
}

export function saveLastReveal(entry: CachedReveal): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_REVEAL_STORAGE_KEY, JSON.stringify(entry));
}

export function loadLastReveal(): CachedReveal | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LAST_REVEAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedReveal>;
    if (
      typeof parsed?.answersHash !== "string" ||
      typeof parsed?.variantId !== "string" ||
      (parsed.framing !== "protagonist" && parsed.framing !== "companion")
    ) {
      return null;
    }
    const characterCheck = validateRevealedCharacter(parsed.character);
    if (!characterCheck.ok) return null;
    return parsed as CachedReveal;
  } catch {
    return null;
  }
}

export function clearLastReveal(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LAST_REVEAL_STORAGE_KEY);
}

export interface CachedFatedReveal {
  answersHash: string;
  variantId: string;
  fatedCharacter: CanonCharacter;
  revealReason: string;
  directions: ParsedDirection[];
  imageUrl: string | null;
}

export function saveLastFatedReveal(entry: CachedFatedReveal): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_FATED_STORAGE_KEY, JSON.stringify(entry));
}

export function loadLastFatedReveal(): CachedFatedReveal | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LAST_FATED_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedFatedReveal>;
    if (
      typeof parsed?.answersHash !== "string" ||
      typeof parsed?.variantId !== "string" ||
      typeof parsed?.revealReason !== "string" ||
      !Array.isArray(parsed?.directions) ||
      typeof parsed?.fatedCharacter !== "object" ||
      parsed.fatedCharacter === null
    ) {
      return null;
    }
    return parsed as CachedFatedReveal;
  } catch {
    return null;
  }
}

export function clearLastFatedReveal(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LAST_FATED_STORAGE_KEY);
}

/** Wipe every back-nav cache. Used by `startOver`. */
export function clearBackNavCaches(): void {
  clearLastAnswers();
  clearLastReveal();
  clearLastFatedReveal();
}