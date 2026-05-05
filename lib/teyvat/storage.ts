import { ADVENTURE_STORAGE_KEY, LIBRARY_STORAGE_KEY } from "@/lib/constants";
import { validateRevealedCharacter } from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";

function hasValidAdventureShape(value: unknown): value is AdventureState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AdventureState> & { character?: unknown };
  const characterCheck = validateRevealedCharacter(candidate.character);

  return (
    characterCheck.ok &&
    Array.isArray(candidate.scenes) &&
    typeof candidate.ended === "boolean" &&
    (candidate.endedBy === "model" || candidate.endedBy === "user" || candidate.endedBy === null) &&
    typeof candidate.startedAt === "string"
  );
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
    return hasValidAdventureShape(parsed) ? parsed : null;
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
    return parsed.filter(hasValidAdventureShape);
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