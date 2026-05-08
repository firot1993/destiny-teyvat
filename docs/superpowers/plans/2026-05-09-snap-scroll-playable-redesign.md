# Snap-scroll Playable UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current phase-state-machine playable flow with a single vertically-scrolling document of full-viewport stages (snap-scroll), three visual tiers (Atmospheric / Reading / Theatrical), a commit-gated questionnaire, and a branching scene tree post-reveal.

**Architecture:** One scroll container in `app/page.tsx` renders an ordered list of stage components keyed off the current `AdventureState`. State machine in `useAdventure.ts` continues to own generation logic but exposes a scene **tree** (not a linear array) plus `currentStageIndex` and branch-nav helpers. Visual tiers are CSS palettes/decorations declared in a new `lib/teyvat/stageTiers.ts`, themed per-Vision through the existing element palette.

**Tech Stack:** Next.js 15 / React 18, Vitest + Testing Library + jsdom, TypeScript, inline `React.CSSProperties` styles (project convention).

**Spec:** [docs/superpowers/specs/2026-05-09-snap-scroll-playable-redesign-design.md](../specs/2026-05-09-snap-scroll-playable-redesign-design.md)

**Visual references** (lift styling from these — already validated with the user):
- Working snap-scroll prototype: `.superpowers/brainstorm/2293-1778252636/content/prototype.html`
- Reading-palette + long-scene behavior: `.superpowers/brainstorm/2293-1778252636/content/reading-palette.html`
- Branch pager UI: `.superpowers/brainstorm/2293-1778252636/content/scene-branches.html`

**Phasing:** Tasks group into 7 phases. Each phase ends in a working build (no half-shipped state). Suggested commit-and-pause points are flagged.

---

## Phase 1 — Scene tree data model

The tree replaces `AdventureState.scenes: Scene[]` with `AdventureState.tree: SceneTree`. The single-path "active branch" is the only thing rendered; siblings are reachable via the pager. This phase is pure data, fully TDD'd, no UI changes.

### Task 1: Create `SceneTree` type + helpers

**Files:**
- Create: `lib/teyvat/sceneTree.ts`
- Test: `test/teyvat/sceneTree.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/teyvat/sceneTree.test.ts
import { describe, expect, it } from "vitest";
import {
  createTree,
  appendChild,
  forkAt,
  switchSibling,
  findChildByChoice,
  childrenOf,
  activeScenes,
  type SceneNode,
  type SceneTree,
} from "@/lib/teyvat/sceneTree";

const baseNode = (overrides: Partial<SceneNode> = {}): SceneNode => ({
  id: "n1",
  parentId: null,
  depth: 1,
  choiceTaken: null,
  prose: "Scene I prose.",
  choices: ["a", "b", "c"],
  closing: false,
  summary: "scene 1",
  fromChoice: "",
  ...overrides,
});

describe("createTree", () => {
  it("creates a single-node tree with the root active", () => {
    const root = baseNode();
    const tree = createTree(root);
    expect(tree.rootId).toBe("n1");
    expect(tree.activePath).toEqual(["n1"]);
    expect(tree.nodes["n1"]).toEqual(root);
  });
});

describe("appendChild", () => {
  it("appends a child to the active leaf, extending the active path", () => {
    const tree = createTree(baseNode());
    const child: SceneNode = {
      id: "n2",
      parentId: "n1",
      depth: 2,
      choiceTaken: "a",
      prose: "Scene II prose.",
      choices: ["x", "y", "z"],
      closing: false,
      summary: "scene 2",
      fromChoice: "a",
    };
    const next = appendChild(tree, child);
    expect(next.activePath).toEqual(["n1", "n2"]);
    expect(next.nodes["n2"]).toEqual(child);
  });
});

describe("forkAt", () => {
  it("forks a new sibling at depth and replaces active path from there", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: ["p","q","r"], closing: false, summary: "", fromChoice: "a",
    });
    tree = appendChild(tree, {
      id: "n3a", parentId: "n2a", depth: 3, choiceTaken: "p",
      prose: "III-a", choices: ["s","t","u"], closing: false, summary: "", fromChoice: "p",
    });
    // Now fork at n1 with choice "b" (different sibling)
    const sibling: SceneNode = {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: ["m","n","o"], closing: false, summary: "", fromChoice: "b",
    };
    const next = forkAt(tree, "n1", sibling);
    expect(next.activePath).toEqual(["n1", "n2b"]);
    expect(next.nodes["n2a"]).toBeDefined(); // preserved
    expect(next.nodes["n3a"]).toBeDefined(); // preserved
    expect(next.nodes["n2b"]).toEqual(sibling);
  });
});

describe("switchSibling", () => {
  it("switches active path to an existing sibling at depth, preserving deeper history", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: ["p","q","r"], closing: false, summary: "", fromChoice: "a",
    });
    tree = appendChild(tree, {
      id: "n3a", parentId: "n2a", depth: 3, choiceTaken: "p",
      prose: "III-a", choices: [], closing: false, summary: "", fromChoice: "p",
    });
    tree = forkAt(tree, "n1", {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: ["m","n","o"], closing: false, summary: "", fromChoice: "b",
    });
    // active path is now [n1, n2b]; switching back to n2a should restore [n1, n2a, n3a]
    const next = switchSibling(tree, "n2a");
    expect(next.activePath).toEqual(["n1", "n2a", "n3a"]);
  });
});

describe("findChildByChoice", () => {
  it("returns the existing child for a (parentId, choice) pair if any", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    expect(findChildByChoice(tree, "n1", "a")?.id).toBe("n2a");
    expect(findChildByChoice(tree, "n1", "z")).toBeNull();
  });
});

describe("childrenOf", () => {
  it("returns all children of a node, ordered by depth then by id", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2a", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II-a", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    tree = forkAt(tree, "n1", {
      id: "n2b", parentId: "n1", depth: 2, choiceTaken: "b",
      prose: "II-b", choices: [], closing: false, summary: "", fromChoice: "b",
    });
    expect(childrenOf(tree, "n1").map((n) => n.id).sort()).toEqual(["n2a", "n2b"]);
  });
});

describe("activeScenes", () => {
  it("returns the active path's nodes in order", () => {
    let tree = createTree(baseNode());
    tree = appendChild(tree, {
      id: "n2", parentId: "n1", depth: 2, choiceTaken: "a",
      prose: "II", choices: [], closing: false, summary: "", fromChoice: "a",
    });
    expect(activeScenes(tree).map((n) => n.id)).toEqual(["n1", "n2"]);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```
npm test -- test/teyvat/sceneTree.test.ts
```
Expected: all FAIL — module does not exist yet.

- [ ] **Step 3: Implement `lib/teyvat/sceneTree.ts`**

```ts
// lib/teyvat/sceneTree.ts
export interface SceneNode {
  id: string;
  parentId: string | null;
  depth: number;          // 1-indexed; root = 1
  choiceTaken: string | null; // null on root
  prose: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;     // back-compat with current Scene.fromChoice
}

export interface SceneTree {
  nodes: Record<string, SceneNode>;
  rootId: string;
  /** Ordered ids root → current leaf — what the document renders. */
  activePath: string[];
}

export function createTree(root: SceneNode): SceneTree {
  return {
    nodes: { [root.id]: { ...root, parentId: null, depth: 1, choiceTaken: null } },
    rootId: root.id,
    activePath: [root.id],
  };
}

export function appendChild(tree: SceneTree, node: SceneNode): SceneTree {
  return {
    ...tree,
    nodes: { ...tree.nodes, [node.id]: node },
    activePath: [...tree.activePath, node.id],
  };
}

/** Fork a new child of `parentId` and switch active path to it. */
export function forkAt(tree: SceneTree, parentId: string, child: SceneNode): SceneTree {
  const parentIdx = tree.activePath.indexOf(parentId);
  const trimmed = parentIdx >= 0 ? tree.activePath.slice(0, parentIdx + 1) : [tree.rootId];
  return {
    ...tree,
    nodes: { ...tree.nodes, [child.id]: child },
    activePath: [...trimmed, child.id],
  };
}

/**
 * Switch the active path to include `targetId` at its depth. The deeper
 * portion of the path is restored to the most-recently-walked descendant
 * chain (the path that previously ended in this subtree).
 */
export function switchSibling(tree: SceneTree, targetId: string): SceneTree {
  const target = tree.nodes[targetId];
  if (!target) return tree;
  const parent = target.parentId ? tree.nodes[target.parentId] : null;
  // Build prefix: root → ... → parent → target
  const prefix: string[] = [];
  let cursor: SceneNode | null = target;
  while (cursor) {
    prefix.unshift(cursor.id);
    cursor = cursor.parentId ? tree.nodes[cursor.parentId] : null;
  }
  // Then walk the deepest chain from target downward — pick the
  // most-recently-added child at each step until a leaf is reached.
  const suffix: string[] = [];
  let walk = targetId;
  // Use insertion order over node entries to find children of `walk`
  const childrenIndex: Record<string, string[]> = {};
  for (const id of Object.keys(tree.nodes)) {
    const n = tree.nodes[id];
    if (n.parentId) {
      childrenIndex[n.parentId] = childrenIndex[n.parentId] ?? [];
      childrenIndex[n.parentId].push(id);
    }
  }
  while (childrenIndex[walk] && childrenIndex[walk].length > 0) {
    const pick = childrenIndex[walk][childrenIndex[walk].length - 1];
    suffix.push(pick);
    walk = pick;
    if (parent && walk === parent.id) break; // safety
  }
  return { ...tree, activePath: [...prefix, ...suffix] };
}

export function findChildByChoice(
  tree: SceneTree,
  parentId: string,
  choice: string
): SceneNode | null {
  for (const id of Object.keys(tree.nodes)) {
    const n = tree.nodes[id];
    if (n.parentId === parentId && n.choiceTaken === choice) {
      return n;
    }
  }
  return null;
}

export function childrenOf(tree: SceneTree, parentId: string): SceneNode[] {
  return Object.values(tree.nodes).filter((n) => n.parentId === parentId);
}

export function activeScenes(tree: SceneTree): SceneNode[] {
  return tree.activePath.map((id) => tree.nodes[id]).filter(Boolean);
}
```

- [ ] **Step 4: Run tests, confirm pass**

```
npm test -- test/teyvat/sceneTree.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/sceneTree.ts test/teyvat/sceneTree.test.ts
git commit -m "feat(teyvat): add SceneTree data model with branching helpers"
```

### Task 2: Migrate `AdventureState` to use the tree

`AdventureState` keeps `scenes: Scene[]` for back-compat *during the migration window*; we add `tree: SceneTree` as the source of truth and derive `scenes` from `activeScenes(tree)` so existing call sites keep working until they're updated.

**Files:**
- Modify: `lib/teyvat/scenes.ts`
- Test: `test/teyvat/scenes.tree.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/scenes.tree.test.ts
import { describe, expect, it } from "vitest";
import { activeScenesOf, withSceneAppended, type AdventureState } from "@/lib/teyvat/scenes";
import { createTree } from "@/lib/teyvat/sceneTree";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const stubChar = {
  framing: "protagonist", name: "X", title: "—", vision: "Anemo",
  nation: "Mondstadt", weapon: "Catalyst", archetype: "—", bio: "—",
  visionStory: "—", constellation: "—", signature: "—", knownAssociate: "",
  awakeningHook: "—",
} as unknown as RevealedCharacter;

describe("activeScenesOf / withSceneAppended", () => {
  it("returns the active path scenes in legacy Scene[] shape", () => {
    const tree = createTree({
      id: "n1", parentId: null, depth: 1, choiceTaken: null,
      prose: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "",
    });
    const state: AdventureState = {
      id: "adv1", character: stubChar, tree, ended: false, endedBy: null,
      startedAt: "2026-05-09T00:00:00Z",
    };
    const scenes = activeScenesOf(state);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[0].text).toBe("P1");
  });

  it("withSceneAppended adds a new scene to the active leaf", () => {
    const tree = createTree({
      id: "n1", parentId: null, depth: 1, choiceTaken: null,
      prose: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "",
    });
    const state: AdventureState = {
      id: "adv1", character: stubChar, tree, ended: false, endedBy: null,
      startedAt: "2026-05-09T00:00:00Z",
    };
    const next = withSceneAppended(state, "n2", "a", {
      sceneNumber: 2, text: "P2", choices: ["x","y"], closing: false, summary: "s2", fromChoice: "a",
    });
    expect(next.tree.activePath).toEqual(["n1", "n2"]);
    expect(activeScenesOf(next).map((s) => s.sceneNumber)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails (compile error)**

- [ ] **Step 3: Update `lib/teyvat/scenes.ts`**

```ts
// lib/teyvat/scenes.ts
import type { RevealedCharacter } from "@/lib/teyvat/character";
import {
  activeScenes as activeFromTree,
  appendChild,
  type SceneNode,
  type SceneTree,
} from "@/lib/teyvat/sceneTree";

export interface Scene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;
}

export interface StoryDirection {
  id: string;
  title: string;
  hook: string;
}

export interface AdventureState {
  id: string;
  character: RevealedCharacter;
  /** Branching scene tree. Renderer uses `activeScenesOf(state)`. */
  tree: SceneTree;
  ended: boolean;
  endedBy: "model" | "user" | null;
  startedAt: string;
  variantId?: string;
  revealReason?: string;
  storyDirection?: StoryDirection | null;
  /**
   * True once the user has committed past the reveal. Pre-reveal stages
   * become read-only after this flips. The flag is set on first scene
   * generation and never reverts within a run.
   */
  committed?: boolean;
}

export function nextSceneNumber(state: AdventureState): number {
  return activeFromTree(state.tree).length + 1;
}

export function activeScenesOf(state: AdventureState): Scene[] {
  return activeFromTree(state.tree).map((node, idx) => ({
    sceneNumber: idx + 1,
    text: node.prose,
    choices: node.choices,
    closing: node.closing,
    summary: node.summary,
    fromChoice: node.fromChoice,
  }));
}

export function withSceneAppended(
  state: AdventureState,
  newNodeId: string,
  choiceTaken: string,
  scene: Scene
): AdventureState {
  const active = activeFromTree(state.tree);
  const parent = active[active.length - 1];
  const node: SceneNode = {
    id: newNodeId,
    parentId: parent?.id ?? null,
    depth: (parent?.depth ?? 0) + 1,
    choiceTaken,
    prose: scene.text,
    choices: scene.choices,
    closing: scene.closing,
    summary: scene.summary,
    fromChoice: scene.fromChoice,
  };
  return { ...state, tree: appendChild(state.tree, node) };
}
```

- [ ] **Step 4: Run all tests, fix breakage in callers**

```
npm test
```

Existing call sites use `state.scenes`. Until they migrate (Task 4), add a temporary getter pattern: callers can switch to `activeScenesOf(state)`. This task **does not** update callers — those changes happen in Task 4 to keep this commit small.

You may see test failures in `test/teyvat/storage.test.ts`, `test/teyvat/storage.variantId.test.ts`, `test/teyvat/useAdventure.test.tsx` because they reference `scenes`. Mark expected — they'll be addressed in Tasks 3 and 4.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/scenes.ts test/teyvat/scenes.tree.test.ts
git commit -m "feat(teyvat): switch AdventureState from scenes[] to SceneTree"
```

### Task 3: Storage migration (legacy `scenes` → `tree`)

**Files:**
- Modify: `lib/teyvat/storage.ts`
- Test: `test/teyvat/storage.migration.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/storage.migration.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADVENTURE_STORAGE_KEY } from "@/lib/constants";
import { loadAdventure } from "@/lib/teyvat/storage";

const legacyShape = {
  id: "legacy1",
  character: {
    framing: "protagonist", name: "Lirien", title: "of the seven winds",
    vision: "Anemo", nation: "Mondstadt", weapon: "Catalyst",
    archetype: "scholar", bio: "—", visionStory: "—",
    constellation: "—", signature: "—", knownAssociate: "",
    awakeningHook: "—",
  },
  scenes: [
    { sceneNumber: 1, text: "P1", choices: ["a","b"], closing: false, summary: "s1", fromChoice: "" },
    { sceneNumber: 2, text: "P2", choices: ["c","d"], closing: false, summary: "s2", fromChoice: "a" },
  ],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-08T00:00:00Z",
};

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe("loadAdventure() — legacy migration", () => {
  it("converts legacy scenes[] to a single-path SceneTree", () => {
    localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(legacyShape));
    const loaded = loadAdventure();
    expect(loaded).not.toBeNull();
    expect(loaded!.tree.activePath).toHaveLength(2);
    expect(loaded!.tree.nodes[loaded!.tree.activePath[0]].prose).toBe("P1");
    expect(loaded!.tree.nodes[loaded!.tree.activePath[1]].prose).toBe("P2");
    expect(loaded!.tree.nodes[loaded!.tree.activePath[1]].choiceTaken).toBe("a");
  });

  it("loads new tree-shape adventures unchanged", () => {
    const newShape = {
      ...legacyShape,
      tree: {
        rootId: "n1",
        nodes: {
          n1: { id: "n1", parentId: null, depth: 1, choiceTaken: null,
                prose: "P1", choices: [], closing: false, summary: "s1", fromChoice: "" },
        },
        activePath: ["n1"],
      },
    };
    delete (newShape as Partial<typeof newShape>).scenes;
    localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(newShape));
    const loaded = loadAdventure();
    expect(loaded!.tree.activePath).toEqual(["n1"]);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

- [ ] **Step 3: Update `lib/teyvat/storage.ts` to migrate**

Replace `hasValidAdventureShape` with a migrating reader. Add a `migrateLegacy()` helper:

```ts
import { createTree, appendChild, type SceneNode } from "@/lib/teyvat/sceneTree";

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
```

Update `loadAdventure()` to:

```ts
export function loadAdventure(): AdventureState | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isLegacy(parsed)) return migrateLegacy(parsed);
    if (hasValidTreeShape(parsed)) return parsed as AdventureState;
    return null;
  } catch { return null; }
}
```

Add `hasValidTreeShape`:

```ts
function hasValidTreeShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { tree?: unknown; character?: unknown; ended?: unknown; startedAt?: unknown };
  if (typeof v.tree !== "object" || v.tree === null) return false;
  const t = v.tree as { rootId?: unknown; nodes?: unknown; activePath?: unknown };
  if (typeof t.rootId !== "string" || typeof t.nodes !== "object" || !Array.isArray(t.activePath)) return false;
  const characterCheck = validateRevealedCharacter(v.character);
  return characterCheck.ok && typeof v.ended === "boolean" && typeof v.startedAt === "string";
}
```

Update `loadLibrary()` similarly — apply `migrateLegacy` when reading; only retain entries that pass either shape.

- [ ] **Step 4: Run all tests**

```
npm test
```

Existing storage tests should now pass against the migration logic. Snapshot `test/teyvat/storage.test.ts` and `test/teyvat/storage.variantId.test.ts` — update them if they assert on the legacy shape directly. The expected pattern: tests that asserted `loaded.scenes` should switch to `activeScenesOf(loaded)` (already imported).

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/storage.ts test/teyvat/storage.migration.test.ts test/teyvat/storage.test.ts test/teyvat/storage.variantId.test.ts
git commit -m "feat(teyvat): migrate legacy scenes[] to SceneTree on read"
```

### Task 4: Migrate `useAdventure` callers to the tree

This is mechanical: replace every `state.scenes` read with `activeScenesOf(state)`, and every "append scene" mutation with `withSceneAppended(state, id, choice, scene)`.

**Files:**
- Modify: `hooks/useAdventure.ts`
- Modify: `test/teyvat/useAdventure.test.tsx`

- [ ] **Step 1: Read [hooks/useAdventure.ts](../../hooks/useAdventure.ts:382-430), identify every `scenes`/`scenes.length` access**

Currently inside `generateScene`:

```ts
const sceneNumber = currentAdventure.scenes.length + 1;
// ...
scenes: [...currentAdventure.scenes, scene],
```

And in `loadFromLibrary`, `resumeAdventure`: `entry.scenes.length > 0`.

- [ ] **Step 2: Update `generateScene` to use the tree**

```ts
import { activeScenesOf, withSceneAppended, nextSceneNumber, type Scene } from "@/lib/teyvat/scenes";

// inside generateScene:
const sceneNumber = nextSceneNumber(currentAdventure);
// ... after parse:
const newNodeId = generateId();
const scene: Scene = { sceneNumber, text: parsed.text, choices: parsed.choices,
  closing: forcedClosing ? true : parsed.closing, summary: parsed.summary || `Scene ${sceneNumber}`,
  fromChoice: previousChoice };
const nextAdventure: AdventureState = {
  ...withSceneAppended(currentAdventure, newNodeId, previousChoice, scene),
  ended: forcedClosing ? true : parsed.closing,
  endedBy: forcedClosing || parsed.closing ? "model" : null,
  committed: true,
};
```

- [ ] **Step 3: Update `loadFromLibrary` and `resumeAdventure`**

Replace `entry.scenes.length > 0` with `activeScenesOf(entry).length > 0`. Replace `current.scenes.length > 0` likewise in `startOver`.

- [ ] **Step 4: Update reveal/direction-pick adventure construction**

Replace the inline `{ ..., scenes: [], ... }` adventure literal in `submitQuestionnaire` (cached + uncached branches) and `pickDirection` and `enterWorld` with a helper:

```ts
function freshAdventure(character: RevealedCharacter, variantId: string, opts: {
  revealReason?: string; storyDirection?: StoryDirection | null;
} = {}): AdventureState {
  return {
    id: generateId(), character, tree: createTree({
      id: generateId(), parentId: null, depth: 1, choiceTaken: null,
      // Empty root prose — overwritten on first scene generation. Until then
      // there is no scene to render; the document only shows pre-scene stages.
      prose: "", choices: [], closing: false, summary: "", fromChoice: "",
    }),
    ended: false, endedBy: null, startedAt: new Date().toISOString(),
    variantId, committed: false,
    revealReason: opts.revealReason, storyDirection: opts.storyDirection ?? null,
  };
}
```

Then update first-scene generation in `generateScene` to detect `committed === false` and **replace** the empty root rather than appending. Update the function:

```ts
const isFirstScene = !currentAdventure.committed;
// ...
let nextAdventure: AdventureState;
if (isFirstScene) {
  // Overwrite the root scene in place
  const rootId = currentAdventure.tree.rootId;
  const replacedTree: SceneTree = {
    ...currentAdventure.tree,
    nodes: {
      ...currentAdventure.tree.nodes,
      [rootId]: { ...currentAdventure.tree.nodes[rootId],
        prose: parsed.text, choices: parsed.choices,
        closing: forcedClosing ? true : parsed.closing,
        summary: parsed.summary || `Scene 1`, fromChoice: previousChoice },
    },
  };
  nextAdventure = { ...currentAdventure, tree: replacedTree, committed: true,
    ended: forcedClosing ? true : parsed.closing,
    endedBy: forcedClosing || parsed.closing ? "model" : null };
} else {
  nextAdventure = { ...withSceneAppended(currentAdventure, generateId(), previousChoice, scene),
    ended: forcedClosing ? true : parsed.closing,
    endedBy: forcedClosing || parsed.closing ? "model" : null };
}
```

- [ ] **Step 5: Update `test/teyvat/useAdventure.test.tsx`**

Search for `state.scenes` / `adventure.scenes` and update to `activeScenesOf(adventure)`. Search for tests that construct an `AdventureState` literal with `scenes: []` — replace with the freshAdventure helper or inline `tree: createTree({...})`.

- [ ] **Step 6: Run all tests**

```
npm test
```

All existing tests should pass. If any do not, the migration of that test is incomplete — fix and re-run.

- [ ] **Step 7: Commit**

```bash
git add hooks/useAdventure.ts test/teyvat/useAdventure.test.tsx
git commit -m "refactor(teyvat): migrate useAdventure to tree-based scenes"
```

**🟢 Phase 1 complete. The app behaves identically to before but uses the tree internally.**

---

## Phase 2 — Stage tier foundation

Three visual tiers as data, plus per-Vision palette resolution. No new components yet.

### Task 5: Stage tier definitions

**Files:**
- Create: `lib/teyvat/stageTiers.ts`
- Test: `test/teyvat/stageTiers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test, confirm fail**

- [ ] **Step 3: Implement `lib/teyvat/stageTiers.ts`**

```ts
import type { Vision } from "@/lib/teyvat/elements";

export type StageKind =
  | "title" | "chapter-intro" | "question" | "reveal" | "scene" | "ending";

export type StageTier = "atmospheric" | "reading" | "theatrical";

export interface TierPalette {
  ground: string;        // CSS for `background` of the stage
  ink: string;           // primary text
  inkSoft: string;       // secondary text
  accent: string;        // Vision accent (e.g., for selected underline, dropcap)
  accentDeep: string;    // darker shade of accent
  gold: string;          // ornament gold
  goldBright: string;    // theatrical gold
  silhouette?: string;   // theatrical only — silhouette gradient seed
}

const VISION_ACCENT: Record<Vision, { color: string; deep: string }> = {
  Anemo: { color: "#74c2a4", deep: "#3a8060" },
  Pyro: { color: "#ed5a3a", deep: "#8a2a18" },
  Hydro: { color: "#3d92e1", deep: "#1f4f80" },
  Cryo: { color: "#9fd3e8", deep: "#3f7a92" },
  Electro: { color: "#b886e0", deep: "#5d3f80" },
  Geo: { color: "#fab43c", deep: "#8a5a18" },
  Dendro: { color: "#a5c83b", deep: "#4f6a18" },
};

export function tierFor(kind: StageKind): StageTier {
  switch (kind) {
    case "title": case "chapter-intro": case "ending": return "atmospheric";
    case "question": case "scene": return "reading";
    case "reveal": return "theatrical";
  }
}

export function paletteFor(tier: StageTier, vision: Vision): TierPalette {
  const accent = VISION_ACCENT[vision];
  const gold = "#b88a40";
  const goldBright = "#d4a861";
  switch (tier) {
    case "atmospheric":
      return {
        ground: "linear-gradient(180deg, #c8d4d2 0%, #a8c2bf 50%, #d4c8a0 90%, #b89860 100%)",
        ink: "#1a1612", inkSoft: "#4a4238", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
      };
    case "reading":
      return {
        ground: "linear-gradient(180deg, #ede4cf 0%, #ddd2b6 100%)",
        ink: "#1a1612", inkSoft: "#4a4238", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
      };
    case "theatrical":
      return {
        ground: "radial-gradient(ellipse at center, #2a3858 0%, #14213d 50%, #0a1228 100%)",
        ink: "#f5e8c8", inkSoft: "#d4a861", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
        silhouette: `linear-gradient(180deg, ${accent.color} 0%, ${accent.deep} 80%, transparent 100%)`,
      };
  }
}
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/stageTiers.ts test/teyvat/stageTiers.test.ts
git commit -m "feat(teyvat): stage tier palette definitions per Vision"
```

### Task 6: Theme additions

**Files:** modify `lib/teyvat/theme.ts`

- [ ] **Step 1: Add tier-aware exports**

Append to `lib/teyvat/theme.ts`:

```ts
export const STAGE_FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
export const TIER_TRANSITION = "background 600ms ease, color 400ms ease";
```

- [ ] **Step 2: Commit**

```bash
git add lib/teyvat/theme.ts
git commit -m "feat(teyvat): add stage transition tokens to theme"
```

### Task 7: Atmosphere effects component

**Files:**
- Create: `components/teyvat/effects/Atmosphere.tsx`

- [ ] **Step 1: Write the component**

Reference: lift the `.horizon`, `.horizon-far`, `.wind-line`, `.corner` blocks from `.superpowers/brainstorm/2293-1778252636/content/prototype.html`.

```tsx
// components/teyvat/effects/Atmosphere.tsx
"use client";
import type { TierPalette } from "@/lib/teyvat/stageTiers";

interface Props {
  palette: TierPalette;
  /** Number of wind streaks to render. Default 3. */
  windStreaks?: number;
}

const layerStyle: React.CSSProperties = {
  position: "absolute", left: 0, right: 0, pointerEvents: "none", zIndex: 0,
};

export function Atmosphere({ palette, windStreaks = 3 }: Props) {
  return (
    <>
      <svg style={{ ...layerStyle, bottom: "30%", height: "22%", opacity: 0.32 }}
           viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden>
        <polygon points="0,80 50,40 110,55 180,30 240,48 320,32 380,50 400,38 400,80"
                 fill="#5a6878"/>
      </svg>
      <svg style={{ ...layerStyle, bottom: "22%", height: "36%", opacity: 0.6 }}
           viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <polygon points="0,100 40,55 90,75 140,40 200,68 260,38 310,62 360,42 400,68 400,100"
                 fill="#3d4858"/>
      </svg>
      <span style={{ position: "absolute", top: 18, left: 22, color: palette.gold,
                     fontSize: 22, lineHeight: 1, zIndex: 2 }}>❦</span>
      <span style={{ position: "absolute", bottom: 18, right: 22, color: palette.gold,
                     fontSize: 22, lineHeight: 1, zIndex: 2 }}>❦</span>
      {Array.from({ length: windStreaks }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", height: 1, top: `${20 + i * 15}%`,
          left: `${(i * 12) % 30}%`, width: `${45 + (i % 3) * 5}%`,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
          pointerEvents: "none", zIndex: 1,
          animation: `dh-wind 7s linear ${i * 1.4}s infinite`,
        }} />
      ))}
      <style jsx>{`
        @keyframes dh-wind {
          0% { transform: translateX(-30%); opacity: 0; }
          20% { opacity: 0.7; }
          80% { opacity: 0.5; }
          100% { transform: translateX(60%); opacity: 0; }
        }
      `}</style>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/effects/Atmosphere.tsx
git commit -m "feat(teyvat): atmospheric horizon + wind streaks component"
```

### Task 8: Wish effects component

**Files:**
- Create: `components/teyvat/effects/WishEffects.tsx`

- [ ] **Step 1: Write the component**

Reference: lift the `.star`, `.silhouette`, `.filigree`, conic-gradient overlays from `prototype.html`.

```tsx
// components/teyvat/effects/WishEffects.tsx
"use client";
import type { TierPalette } from "@/lib/teyvat/stageTiers";

interface Props {
  palette: TierPalette;
  /** Show silhouette? Hide once portrait image arrives. */
  showSilhouette?: boolean;
}

const STAR_POSITIONS = [
  { top: "8%", left: "15%", delay: "0s" },
  { top: "14%", left: "78%", delay: "1s" },
  { top: "22%", left: "42%", delay: "2s" },
  { top: "30%", left: "8%", delay: "0.5s" },
  { top: "38%", left: "88%", delay: "1.5s" },
  { top: "18%", left: "60%", delay: "2.5s" },
  { top: "46%", left: "22%", delay: "3s" },
  { top: "10%", left: "35%", delay: "1.2s" },
  { top: "6%", left: "70%", delay: "2.8s" },
  { top: "42%", left: "55%", delay: "0.8s" },
];

export function WishEffects({ palette, showSilhouette = true }: Props) {
  return (
    <>
      {/* gold rays */}
      <span style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: `conic-gradient(from 90deg at 50% 60%,
          transparent 0deg, rgba(228,193,120,0.18) 25deg,
          transparent 50deg, rgba(228,193,120,0.10) 80deg,
          transparent 110deg, rgba(228,193,120,0.20) 145deg,
          transparent 175deg, rgba(228,193,120,0.08) 220deg,
          transparent 250deg, rgba(228,193,120,0.16) 290deg,
          transparent 330deg, rgba(228,193,120,0.18) 360deg)`,
      }} />
      {/* center bloom */}
      <span style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at center 60%, rgba(228,193,120,0.32) 0%, transparent 35%)",
      }} />
      {/* stars */}
      {STAR_POSITIONS.map((s, i) => (
        <span key={i} style={{
          position: "absolute", top: s.top, left: s.left,
          width: 2, height: 2, background: "rgba(255,250,235,0.9)",
          borderRadius: "50%", boxShadow: "0 0 4px rgba(255,250,235,0.6)",
          pointerEvents: "none", zIndex: 1,
          animation: `dh-twinkle 4s ease-in-out ${s.delay} infinite`,
        }} />
      ))}
      {/* filigree top corners */}
      <svg viewBox="0 0 64 64" style={{
        position: "absolute", top: 18, left: 22, width: 64, height: 64,
        color: palette.goldBright, pointerEvents: "none", zIndex: 3,
      }} aria-hidden>
        <path d="M2,2 L62,2 M2,2 L2,62 M2,2 Q22,12 32,32 M2,2 Q12,22 32,32"
              stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"/>
      </svg>
      <svg viewBox="0 0 64 64" style={{
        position: "absolute", top: 18, right: 22, width: 64, height: 64,
        color: palette.goldBright, pointerEvents: "none", zIndex: 3,
        transform: "scaleX(-1)",
      }} aria-hidden>
        <path d="M2,2 L62,2 M2,2 L2,62 M2,2 Q22,12 32,32 M2,2 Q12,22 32,32"
              stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"/>
      </svg>
      {/* silhouette */}
      {showSilhouette && (
        <span style={{
          position: "absolute", bottom: "26%", left: "50%", transform: "translateX(-50%)",
          width: 130, height: 220,
          background: palette.silhouette,
          WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
          maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
          borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
          boxShadow: `0 0 60px ${palette.accent}88`,
          pointerEvents: "none", zIndex: 2,
        }} />
      )}
      <style jsx>{`
        @keyframes dh-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/effects/WishEffects.tsx
git commit -m "feat(teyvat): theatrical Wish effects (rays, stars, filigree, silhouette)"
```

### Task 9: StageWrapper

**Files:**
- Create: `components/teyvat/stages/StageWrapper.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/teyvat/stages/StageWrapper.tsx
"use client";
import type { TierPalette, StageTier } from "@/lib/teyvat/stageTiers";

interface Props {
  tier: StageTier;
  palette: TierPalette;
  /** Variable height — true for scenes that may overflow, false for fixed 100vh. */
  scrollable?: boolean;
  /** True when stage should be styled as locked/sealed (post-reveal questionnaire). */
  sealed?: boolean;
  children: React.ReactNode;
}

export function StageWrapper({ tier, palette, scrollable = false, sealed = false, children }: Props) {
  return (
    <section style={{
      minHeight: "100vh",
      scrollSnapAlign: "start",
      scrollSnapStop: "normal",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: scrollable ? "flex-start" : "center",
      alignItems: "center",
      padding: scrollable ? "60px 28px 100px" : "60px 28px 80px",
      textAlign: "center",
      overflow: "hidden",
      background: palette.ground,
      color: palette.ink,
      transition: "background 600ms ease, color 400ms ease",
      filter: sealed ? "grayscale(0.4) opacity(0.6)" : undefined,
      pointerEvents: sealed ? "none" : undefined,
    }}>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/StageWrapper.tsx
git commit -m "feat(teyvat): StageWrapper — snap-scroll section with tier styling"
```

**🟢 Phase 2 complete. Foundation in place; nothing user-visible yet.**

---

## Phase 3 — Stage components

Each stage is a thin shell over `StageWrapper`. Lift styling from prototype HTML files; convert to inline CSS + style-jsx for animations.

### Task 10: TitleStage

**Files:**
- Create: `components/teyvat/stages/TitleStage.tsx`

- [ ] **Step 1: Build the component**

Contract:
```tsx
interface Props {
  palette: TierPalette;
  hasSavedAdventure: boolean;
  hasLibrary: boolean;
  onBegin: () => void;
  onResume: () => void;
  onOpenBookshelf: () => void;
}
```

Layout (lift from `prototype.html` `.stage.title-stage` + `prototype.html` `.cta-row`):
- StageWrapper tier="atmospheric"
- `<Atmosphere palette={palette} />`
- Centered:
  - "Destiny" big serif, letterSpacing "0.16em", fontSize 88
  - "— a teyvat oracle —" tagline, italic, letter-spacing 0.12em
  - Primary button "Begin" → onBegin
  - If hasSavedAdventure: secondary "↩ resume previous run" → onResume
  - If hasLibrary: secondary "↘ open the bookshelf" → onOpenBookshelf
- Bottom scroll chevron (animated bob) — link is decorative

Use `useI18n()` for all copy.

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/TitleStage.tsx
git commit -m "feat(teyvat): TitleStage (atmospheric tier)"
```

### Task 11: ChapterIntroStage

**Files:**
- Create: `components/teyvat/stages/ChapterIntroStage.tsx`

- [ ] **Step 1: Build**

Contract:
```tsx
interface Props {
  palette: TierPalette;
  chapterEyebrow: string;     // "Chapter I"
  chapterTitle: string;       // "Mood"
  chapterSubtitle: string;    // "How you carry yourself..."
  visionLabel: string;        // "Anemo" — shown in vision-mark
}
```

Layout (from `prototype.html` Chapter II intro stage):
- StageWrapper tier="atmospheric"
- `<Atmosphere />`
- Top scroll-up hint
- Centered: eyebrow ("Chapter I"), big chapter title (display, 64px), italic subtitle
- Bottom scroll chevron

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/ChapterIntroStage.tsx
git commit -m "feat(teyvat): ChapterIntroStage (atmospheric tier)"
```

### Task 12: QuestionStage

**Files:**
- Create: `components/teyvat/stages/QuestionStage.tsx`

- [ ] **Step 1: Build**

Contract:
```tsx
import type { QuestionnaireStep, TeyvatAnswers } from "@/lib/teyvat/questionnaire";

interface Props {
  palette: TierPalette;
  step: QuestionnaireStep;          // single step from schema
  stepNumber: number;                // 1-indexed
  totalSteps: number;
  selectedValue: string | undefined;
  language: Language;
  sealed: boolean;                   // true = post-reveal, options disabled
  onPick: (value: string) => void;   // selecting auto-advances; parent triggers scrollIntoView
  visionLabel: string;
}
```

Layout (from `reading-palette.html` `.reading.question`):
- StageWrapper tier="reading" sealed={sealed}
- Reading-tier soft Vision wash (2 radial gradients top-right + bottom-left); add via inline `:before/:after` style hack OR a small wrapper element
- Small gold corners + Vision mark
- Top scroll-up hint
- Eyebrow: `${chapterTitle} · ${stepNumber} of ${totalSteps}` (styled `i of vii` via simple stringy formatting; OK to use Arabic numerals)
- Display question (Georgia 36px, weight 300)
- Options: hairline-bordered buttons; selected = Vision-color italic + Vision-color underline
- Bottom scroll chevron

Picking an option calls `onPick(value)` — caller is responsible for scrolling to the next stage (Task 17).

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/QuestionStage.tsx
git commit -m "feat(teyvat): QuestionStage (reading tier) with sealed state"
```

### Task 13: RevealStage (single character)

**Files:**
- Create: `components/teyvat/stages/RevealStage.tsx`

This stage handles **both** single-character variants and the v2-wish combined reveal+directions. Branch on `directions` prop presence.

- [ ] **Step 1: Build**

Contract:
```tsx
interface Props {
  palette: TierPalette;
  loading: boolean;
  character: RevealedCharacter | null;       // single-character variants
  fatedCharacter: CanonCharacter | null;     // v2-wish
  imageUrl: string | null;
  revealReason: string | null;
  directions: ParsedDirection[] | null;       // v2-wish
  language: Language;
  onAdvance: () => void;                      // single-character: enterWorld
  onPickDirection: (id: string) => void;      // v2-wish
  onCommit: () => void;                       // CTA before reveal generates
  committed: boolean;                          // true once reveal generated
}
```

Layout (from `prototype.html` `.stage.wish`):
- StageWrapper tier="theatrical"
- `<WishEffects palette={palette} showSilhouette={!imageUrl} />`
- Vision badge (circular, glowing)
- If `loading`: eyebrow "the wind is listening…" + breathing dots in place of name
- If single-character (no directions): name (calligraphic, 64px), epithet (italic, gold-bright), nation row (chips), "Walk into her world ↓" advance affordance
- If v2-wish (directions != null):
  - Same name/epithet/nation
  - "Why this one" block: italic prose paragraph showing `revealReason`
  - 3 direction cards (lift `DirectionPicker` card markup, restyle for theatrical ground — gold border, dark ink reversed to cream)
  - On click, `onPickDirection(id)`
- If `!committed && !character && !fatedCharacter`: render an "explicit commit" CTA — the user must click to generate the reveal
- Portrait image replaces silhouette when available (positioned absolutely, same shape as silhouette, at the same place)

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/RevealStage.tsx
git commit -m "feat(teyvat): RevealStage (theatrical tier, single + v2-wish + commit gate)"
```

### Task 14: SceneStage (basic, no branching UI yet)

**Files:**
- Create: `components/teyvat/stages/SceneStage.tsx`

- [ ] **Step 1: Build**

Contract:
```tsx
interface Props {
  palette: TierPalette;
  sceneNumber: number;
  prose: string;
  streamingText: string;
  streaming: boolean;
  closing: boolean;
  choices: string[];
  /** Already-taken choices from siblings — rendered with filled dot. */
  takenChoices: string[];
  visionLabel: string;
  pickedChoice: string | null;       // disable other choices once picked
  onPickChoice: (choice: string) => void;
  onStop: () => void;
}
```

Layout (from `reading-palette.html` `.reading.scene`):
- StageWrapper tier="reading" scrollable
- Reading-tier corner washes
- Top scroll-up hint
- Eyebrow: `Scene ${roman(sceneNumber)}` (use a simple roman helper)
- Prose (font-size 17, line-height 1.78); first paragraph gets a Vision-colored dropcap on its first letter
- Streaming cursor block while `streaming`
- After prose (when not streaming and not closing):
  - Choices: hairline-bordered buttons
  - If choice in `takenChoices`: prefix `● ` with Vision-color
  - Disabled if `pickedChoice` set and not equal
  - "Stop here" link below
- Bottom scroll chevron

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/SceneStage.tsx
git commit -m "feat(teyvat): SceneStage (reading tier, no branching UI yet)"
```

### Task 15: EndingStage

**Files:**
- Create: `components/teyvat/stages/EndingStage.tsx`

- [ ] **Step 1: Build**

Contract:
```tsx
interface Props {
  palette: TierPalette;
  state: AdventureState;
  language: Language;
  hasLibrary: boolean;
  onNewRun: () => void;
  onOpenBookshelf: () => void;
}
```

Layout (from `prototype.html` `.stage.ending`):
- StageWrapper tier="atmospheric"
- Top scroll-up hint
- "— end of the run —" eyebrow
- "Dawn after" display title (or character-themed closing)
- Italic blurb summarizing what happened (use `state.character.name` + `endedBy` to vary copy)
- Primary "Begin again" → onNewRun
- Secondary "↘ open the bookshelf" → onOpenBookshelf

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/EndingStage.tsx
git commit -m "feat(teyvat): EndingStage (atmospheric tier)"
```

### Task 16: BranchPager (placeholder for now)

**Files:**
- Create: `components/teyvat/stages/BranchPager.tsx`

- [ ] **Step 1: Build inert pager (no behavior yet — wired in Phase 5)**

Contract:
```tsx
interface Props {
  branchCount: number;          // total siblings at this depth (>= 2 to render)
  activeIndex: number;          // 0-based
  activeChoiceLabel: string;    // the choice that led to the active sibling
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
}
```

Layout (from `scene-branches.html` `.branch-pager`):
- Render `null` if `branchCount < 2`
- Bordered pill: `‹` button, dots (one per sibling, active filled), italic label, `›` button, "← →" key hint
- Buttons disabled at edges

```tsx
// minimal version
"use client";
import type { CSSProperties } from "react";

export function BranchPager(props: Props) {
  const { branchCount, activeIndex, activeChoiceLabel, onPrev, onNext, onJump } = props;
  if (branchCount < 2) return null;
  // ... render as in scene-branches.html
}
```

- [ ] **Step 2: Commit**

```bash
git add components/teyvat/stages/BranchPager.tsx
git commit -m "feat(teyvat): BranchPager component (inert until wired)"
```

**🟢 Phase 3 complete. All stage components exist; not yet wired into the page.**

---

## Phase 4 — Wire it all together

### Task 17: Add stage-index + commit gate + auto-scroll to `useAdventure`

**Files:**
- Modify: `hooks/useAdventure.ts`

- [ ] **Step 1: Add stage-index state**

```ts
const [currentStageIndex, setCurrentStageIndex] = useState(0);
const docRef = useRef<HTMLDivElement | null>(null);
// expose docRef via the hook return so the page can mount it
```

- [ ] **Step 2: Add `scrollToStage(index)` action**

```ts
const scrollToStage = useCallback((index: number) => {
  const doc = docRef.current;
  if (!doc) return;
  const stage = doc.querySelectorAll<HTMLElement>("[data-stage]")[index];
  if (stage) stage.scrollIntoView({ behavior: "smooth", block: "start" });
  setCurrentStageIndex(index);
}, []);
```

- [ ] **Step 3: Replace `phase` with derived state**

The phase enum is removed. The page renders all stages always (with conditional content for unloaded ones). Streaming/loading is signaled via `loading: boolean` on individual stages.

Add to the hook return:
```ts
loading: { reveal: boolean; scene: boolean };
isCommitted: boolean;
```

Where `isCommitted = !!adventure?.committed`.

- [ ] **Step 4: Replace question-submit flow**

Each `QuestionStage`'s `onPick` updates an in-memory `answers: TeyvatAnswers` map (lifted to the hook) and calls `scrollToStage(currentStageIndex + 1)`. **No reveal generation triggers here.** Reveal generates only on the explicit commit CTA.

```ts
// in useAdventure
const [answers, setAnswers] = useState<TeyvatAnswers>({});
const updateAnswer = useCallback((stepId: string, value: string) => {
  setAnswers((prev) => ({ ...prev, [stepId]: value }));
}, []);

const commitReveal = useCallback(async (language: Language) => {
  // existing submitQuestionnaire logic, but assumes `answers` is complete
  // ... reuse the existing single-reveal / fated-reveal generation paths
}, [answers, ...]);
```

- [ ] **Step 5: Run tests and update**

The existing `useAdventure.test.tsx` was structured around `phase`. Update assertions to use `loading`, `isCommitted`, `answers`, and `currentStageIndex`. Tests that simulated full questionnaire submission can call `updateAnswer` step-by-step then `commitReveal`.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAdventure.ts test/teyvat/useAdventure.test.tsx
git commit -m "refactor(teyvat): replace phase machine with stage-index + commit gate"
```

### Task 18: Rewrite `app/page.tsx` as the vertical document

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire body with a stage list**

```tsx
"use client";
import { useRef } from "react";
import { useAdventure } from "@/hooks/useAdventure";
import { useI18n } from "@/i18n";
import { paletteFor } from "@/lib/teyvat/stageTiers";
import { TitleStage } from "@/components/teyvat/stages/TitleStage";
import { ChapterIntroStage } from "@/components/teyvat/stages/ChapterIntroStage";
import { QuestionStage } from "@/components/teyvat/stages/QuestionStage";
import { RevealStage } from "@/components/teyvat/stages/RevealStage";
import { SceneStage } from "@/components/teyvat/stages/SceneStage";
import { EndingStage } from "@/components/teyvat/stages/EndingStage";
import { Bookshelf } from "@/components/teyvat/Bookshelf";
import { activeScenesOf } from "@/lib/teyvat/scenes";
// ... imports for vision lookup

export default function Page() {
  const { lang, toggleLang } = useI18n();
  const adv = useAdventure();
  const docRef = useRef<HTMLDivElement | null>(null);

  // Pick the active vision; fall back to Anemo for pre-reveal stages
  const vision = adv.character?.vision ?? adv.fatedCharacter?.vision ?? "Anemo";
  const atmospheric = paletteFor("atmospheric", vision);
  const reading = paletteFor("reading", vision);
  const theatrical = paletteFor("theatrical", vision);

  const schema = adv.questionnaireSchema;
  const sealed = adv.isCommitted;

  // Build the linear list of stages.
  const stages: React.ReactNode[] = [];
  // 1. Title
  stages.push(<TitleStage key="title" palette={atmospheric}
    hasSavedAdventure={adv.hasSavedAdventure} hasLibrary={adv.library.length > 0}
    onBegin={() => {/* no-op; user just scrolls */}}
    onResume={adv.resumeAdventure}
    onOpenBookshelf={adv.openBookshelf} />);
  // 2. Chapter intros + questions interleaved
  // Roman numerals for chapter eyebrow ("Chapter I", "Chapter II", "Chapter III")
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  let lastChapter: string | null = null;
  let chapterCount = 0;
  schema.steps.forEach((step, i) => {
    if (step.chapter !== lastChapter) {
      chapterCount += 1;
      const meta = schema.chapterMeta[step.chapter];
      stages.push(<ChapterIntroStage key={`ch-${step.chapter}`}
        palette={atmospheric}
        chapterEyebrow={`Chapter ${ROMAN[chapterCount - 1] ?? chapterCount}`}
        chapterTitle={meta.title[lang]} chapterSubtitle={meta.subtitle[lang]}
        visionLabel={vision} />);
      lastChapter = step.chapter;
    }
    stages.push(<QuestionStage key={step.id}
      palette={reading} step={step} stepNumber={i+1} totalSteps={schema.steps.length}
      selectedValue={adv.answers[step.id]} language={lang} sealed={sealed}
      onPick={(value) => { adv.updateAnswer(step.id, value); adv.scrollToStageDelta(1); }}
      visionLabel={vision} />);
  });
  // 3. Reveal
  stages.push(<RevealStage key="reveal" palette={theatrical}
    loading={adv.loading.reveal}
    character={adv.character} fatedCharacter={adv.fatedCharacter}
    imageUrl={adv.characterImageUrl} revealReason={adv.revealReason}
    directions={adv.storyDirections} language={lang}
    committed={adv.isCommitted}
    onCommit={() => adv.commitReveal(lang)}
    onAdvance={() => adv.enterWorld(lang)}
    onPickDirection={(id) => adv.pickDirection(id, lang)} />);
  // 4. Scenes — render one stage per active-path scene + a generation slot at the leaf
  const scenes = adv.adventure ? activeScenesOf(adv.adventure) : [];
  scenes.forEach((scene, idx) => {
    if (idx === 0 && !adv.isCommitted) return; // skip empty root pre-commit
    stages.push(<SceneStage key={`scene-${idx}`} palette={reading}
      sceneNumber={scene.sceneNumber} prose={scene.text}
      streamingText={adv.loading.scene && idx === scenes.length - 1 ? adv.streamingText : ""}
      streaming={adv.loading.scene && idx === scenes.length - 1}
      closing={scene.closing} choices={scene.choices}
      takenChoices={[]}  /* wired in Phase 5 (Task 21) */
      visionLabel={vision} pickedChoice={null}
      onPickChoice={(c) => adv.chooseChoice(c, lang)}
      onStop={adv.stopHere} />);
  });
  // 5. Ending
  if (adv.adventure?.ended) {
    stages.push(<EndingStage key="ending" palette={atmospheric}
      state={adv.adventure} language={lang}
      hasLibrary={adv.library.length > 0}
      onNewRun={adv.startOver}
      onOpenBookshelf={adv.openBookshelf} />);
  }

  return (
    <main>
      <div ref={docRef} data-doc style={docStyle}>
        {stages.map((s, i) =>
          <div key={i} data-stage data-stage-index={i}>{s}</div>
        )}
      </div>
      {adv.bookshelfOpen && (
        <Bookshelf library={adv.library}
          onResume={adv.loadFromLibrary}
          onClose={adv.closeBookshelf} />
      )}
      {/* HUD: lang toggle + settings icon (kept from existing app/page.tsx) */}
      {/* Quota badge */}
      {adv.error && <div style={errorToast}>{adv.error}</div>}
    </main>
  );
}

const docStyle: React.CSSProperties = {
  height: "100vh", overflowY: "auto",
  scrollSnapType: "y mandatory", scrollBehavior: "smooth",
};
```

The `useAdventure` hook owns `docRef`, exposes `scrollToStageDelta(n)`, `bookshelfOpen`, `closeBookshelf`, `takenChoicesAt(depth)`. Update the hook accordingly.

- [ ] **Step 2: Add small helpers needed by the page**

In `hooks/useAdventure.ts`, expose:
- `bookshelfOpen: boolean` (instead of phase === "bookshelf")
- `takenChoicesAt(sceneDepth)` — computes from the scene tree
- `scrollToStageDelta(delta)` — wraps `scrollToStage(currentStageIndex + delta)`
- `answers: TeyvatAnswers`

- [ ] **Step 3: Run dev server, smoke test the happy path**

```
npm run dev
```

Open in browser. Manually verify:
1. Title scrolls to chapter 1
2. Selecting a question advances to the next
3. Eventually reaches reveal; commit CTA generates; scrolls in
4. After reveal, scenes generate linearly via existing `chooseChoice` flow (Phase 5 will add branching; linear scene loop should already work because Task 4 migrated `chooseChoice` to use `withSceneAppended`)
5. Auto-scroll to a newly generated scene: a `useEffect` in the page watches `activeScenesOf(adventure).length` and calls `scrollToStageDelta(1)` on increment

- [ ] **Step 4: Verify no regressions in existing tests**

```
npm test
```

Tests that referenced phase-based components (e.g., `RevealCard.test.tsx`, `SceneView.test.tsx`) will be invalid because those components still exist but aren't wired to the page anymore. Don't delete them yet — Phase 7 cleans up.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx hooks/useAdventure.ts
git commit -m "refactor(teyvat): rewrite app/page.tsx as snap-scroll document"
```

### Task 19: Verify happy-path manually + add an integration test

**Files:**
- Create: `test/teyvat/snapScroll.integration.test.tsx`

- [ ] **Step 1: Write a smoke test for stage rendering**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("snap-scroll page (smoke)", () => {
  it("renders title + at least one question + reveal stage scaffolds", () => {
    render(<Page />);
    expect(screen.getByText(/destiny/i)).toBeInTheDocument();
    // questionnaire steps present
    expect(screen.getAllByText(/of vii/i).length).toBeGreaterThan(0);
    // reveal stage CTA visible (commit gate, not yet generated)
    expect(screen.getByText(/reveal what answered|wind is listening/i)).toBeInTheDocument();
  });
});
```

(Adjust copy to match `useI18n` strings.)

- [ ] **Step 2: Run, fix any rendering errors**

- [ ] **Step 3: Commit**

```bash
git add test/teyvat/snapScroll.integration.test.tsx
git commit -m "test(teyvat): smoke test for snap-scroll page rendering"
```

**🟢 Phase 4 complete. The new architecture is live; happy path works (no branching yet).**

---

## Phase 5 — Branching scenes

### Task 20: Branch-aware scene generation in `useAdventure`

**Files:**
- Modify: `hooks/useAdventure.ts`

- [ ] **Step 1: Update signatures to thread scene depth, then add fork logic**

The page knows the depth of the SceneStage where the choice was clicked (it has the index when iterating `activeScenes`). Update three signatures to thread scene depth through:

1. `SceneStage` prop: `onPickChoice: (choice: string, sceneDepth: number) => void;` — page passes 1-indexed depth from the active path.
2. `chooseChoice` in `useAdventure`: now `chooseChoice(choice, sceneDepth, language)`.
3. The page's wiring: `onPickChoice={(c, depth) => adv.chooseChoice(c, depth, lang)}` (the 2-arg form from Task 18 expands to 3-arg).

Then implement:

```ts
import { findChildByChoice, forkAt, switchSibling } from "@/lib/teyvat/sceneTree";

const chooseChoice = useCallback(async (choice: string, sceneDepth: number, language: Language) => {
  if (!adventure) return;
  const active = adventure.tree.activePath;
  const parentId = active[sceneDepth - 1];

  // Existing child for this (parent, choice)?
  const existing = findChildByChoice(adventure.tree, parentId, choice);
  if (existing) {
    // Switch siblings — no LLM call
    setAdventure({ ...adventure, tree: switchSibling(adventure.tree, existing.id) });
    scrollToStageDelta(1);
    return;
  }

  // Need to fork: generate a new scene with this choice
  setLoading(/* scene */ true);
  try {
    const stub: AdventureState = { ...adventure, tree: { ...adventure.tree,
      activePath: active.slice(0, sceneDepth) } };
    const { parsed, sceneNumber, forcedClosing } = await generateSceneCore(stub, choice, language);
    const node: SceneNode = { id: generateId(),
      parentId, depth: sceneDepth + 1, choiceTaken: choice,
      prose: parsed.text, choices: parsed.choices,
      closing: forcedClosing ? true : parsed.closing,
      summary: parsed.summary || `Scene ${sceneNumber}`, fromChoice: choice };
    setAdventure((prev) => prev ? {
      ...prev,
      tree: forkAt(prev.tree, parentId, node),
      ended: forcedClosing ? true : parsed.closing,
      endedBy: forcedClosing || parsed.closing ? "model" : null,
    } : null);
    scrollToStageDelta(1);
  } finally { setLoading(false); }
}, [adventure, currentStageIndex, scrollToStageDelta]);
```

Extract a `generateSceneCore(state, choice, lang)` that returns `{ parsed, sceneNumber, forcedClosing }` and contains the LLM call without mutating state.

- [ ] **Step 2: Add `switchSibling` action exposed via the hook**

```ts
const switchToSibling = useCallback((targetNodeId: string) => {
  setAdventure((prev) => prev ? { ...prev, tree: switchSibling(prev.tree, targetNodeId) } : null);
  // Don't scroll — user is at this depth and we just swap below them
}, []);
```

- [ ] **Step 3: Compute `takenChoicesAt(sceneDepth)`**

```ts
const takenChoicesAt = useCallback((sceneNumber: number): string[] => {
  if (!adventure) return [];
  const node = adventure.tree.nodes[adventure.tree.activePath[sceneNumber - 1]];
  if (!node) return [];
  return childrenOf(adventure.tree, node.id).map((c) => c.choiceTaken!).filter(Boolean);
}, [adventure]);
```

- [ ] **Step 4: Compute `siblingsAt(sceneDepth)` for the pager**

```ts
export interface SiblingInfo {
  branchCount: number;
  activeIndex: number;
  activeChoiceLabel: string;
  siblings: SceneNode[];
}

const siblingsAt = useCallback((sceneNumber: number): SiblingInfo => {
  if (!adventure) return { branchCount: 0, activeIndex: 0, activeChoiceLabel: "", siblings: [] };
  const node = adventure.tree.nodes[adventure.tree.activePath[sceneNumber - 1]];
  if (!node || !node.parentId) return { branchCount: 1, activeIndex: 0, activeChoiceLabel: "", siblings: [node] };
  const sibs = childrenOf(adventure.tree, node.parentId);
  const activeIndex = sibs.findIndex((s) => s.id === node.id);
  return { branchCount: sibs.length, activeIndex,
    activeChoiceLabel: node.choiceTaken ?? "",
    siblings: sibs };
}, [adventure]);
```

- [ ] **Step 5: Run tests, add coverage for new helpers**

Add to `test/teyvat/useAdventure.test.tsx`:
```ts
it("forks a new sibling when user picks a different choice on a past scene", async () => {
  // Set up adventure with 3 scenes, then call chooseChoice with a different
  // choice on scene 1. Expect tree.nodes to have 4 nodes (scene 1, the original
  // scene 2-a, the original scene 3 which stays in tree, and the new scene 2-b).
  // Active path should be [scene1, scene2-b].
});

it("switches to existing sibling when user picks a choice that already spawned one", async () => {
  // Set up tree with two siblings. Call chooseChoice with the choice for the
  // non-active sibling. Expect no LLM call (mock fetch and assert it wasn't
  // called). Expect activePath to switch.
});
```

- [ ] **Step 6: Commit**

```bash
git add hooks/useAdventure.ts test/teyvat/useAdventure.test.tsx
git commit -m "feat(teyvat): branch-aware scene chooseChoice (fork or switch)"
```

### Task 21: Wire `BranchPager` into `SceneStage`

**Files:**
- Modify: `components/teyvat/stages/SceneStage.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add pager props to SceneStage**

```tsx
interface Props {
  // ... existing
  siblings: SiblingInfo;       // new
  onSwitchSibling: (nodeId: string) => void; // new
}
```

Render `<BranchPager />` above the eyebrow when `siblings.branchCount >= 2`. Wire `onPrev`, `onNext`, `onJump` to call `onSwitchSibling(siblings.siblings[targetIndex].id)`.

- [ ] **Step 2: Add arrow-key support**

```tsx
useEffect(() => {
  function handler(ev: KeyboardEvent) {
    if (siblings.branchCount < 2) return;
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    if (ev.key === "ArrowLeft" && siblings.activeIndex > 0) {
      onSwitchSibling(siblings.siblings[siblings.activeIndex - 1].id);
    } else if (ev.key === "ArrowRight" && siblings.activeIndex < siblings.branchCount - 1) {
      onSwitchSibling(siblings.siblings[siblings.activeIndex + 1].id);
    }
  }
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [siblings, onSwitchSibling]);
```

Note: only the **active** SceneStage should bind. To prevent double-handling across multiple SceneStages, gate the listener on `isActiveStage` prop (true when the stage is the one currently in view). The page can derive this from `currentStageIndex`.

- [ ] **Step 3: Wire from `app/page.tsx`**

Track the stage index as you push stages into the `stages` array. For each `<SceneStage>`, pass:
- `siblings={adv.siblingsAt(scene.sceneNumber)}`
- `onSwitchSibling={adv.switchToSibling}`
- `isActiveStage={adv.currentStageIndex === stages.length}` (the index this stage will occupy after push)

The simplest way: capture `const stageIndexHere = stages.length;` before the push, then pass that.

- [ ] **Step 4: Manual test**

```
npm run dev
```

Run through to scene 2. Scroll up, pick a different choice. Confirm:
1. New sibling generates and you advance to it
2. Pager bar appears at top of scene 2 with 2 dots
3. Arrow keys / pager buttons cycle siblings
4. The choices on scene 1 show ● for both choices that have been taken

- [ ] **Step 5: Commit**

```bash
git add components/teyvat/stages/SceneStage.tsx app/page.tsx
git commit -m "feat(teyvat): wire BranchPager + arrow keys into SceneStage"
```

**🟢 Phase 5 complete. Branching works end-to-end.**

---

## Phase 6 — Polish

### Task 22: Loading placeholders + streaming

**Files:**
- Modify: `components/teyvat/stages/SceneStage.tsx` (verify streamingText still renders)
- Modify: `components/teyvat/stages/RevealStage.tsx` (verify breathing dots)

- [ ] **Step 1: Verify the loading state of RevealStage**

When `loading=true && !character && !fatedCharacter`, render a calm "the wind is listening…" eyebrow + a centered breathing dots SVG/CSS animation. No advance affordance.

- [ ] **Step 2: Verify scene streaming**

`streaming=true` should render `streamingText` inside the prose area with a blinking cursor `▋` at the end. Choices remain hidden until streaming completes.

- [ ] **Step 3: Manual smoke**

- [ ] **Step 4: Commit**

```bash
git add components/teyvat/stages/SceneStage.tsx components/teyvat/stages/RevealStage.tsx
git commit -m "polish(teyvat): tighten loading and streaming states in stages"
```

### Task 23: Bookshelf overlay + chrome HUD

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add HUD with lang + settings icon**

Top-right floating two-button HUD. Settings icon opens a small panel with provider/model/variant pickers (lift from the existing `app/page.tsx` settings panel). Only show on title and ending stages, plus pre-reveal — hide during the reveal animation. Determine visibility from `currentStageIndex` and `isCommitted`.

- [ ] **Step 2: Bookshelf overlay**

When `adv.bookshelfOpen`, render `<Bookshelf … onClose={adv.closeBookshelf} />` as a fixed-position overlay over the document. The doc continues to scroll behind but pointer events are blocked.

- [ ] **Step 3: Quota badge**

If `dailyRemaining < 3`, render a small floating bottom-left badge.

- [ ] **Step 4: Manual smoke + commit**

```bash
git add app/page.tsx
git commit -m "polish(teyvat): consolidate chrome (HUD, Bookshelf overlay, quota)"
```

### Task 24: Remove deprecated components and tests

**Files:**
- Delete: `components/teyvat/AdventureLog.tsx`
- Delete: `components/teyvat/BackButton.tsx`
- Delete: `components/teyvat/RevealCard.tsx` (folded into RevealStage)
- Delete: `components/teyvat/DirectionPicker.tsx`
- Delete: `components/teyvat/Questionnaire.tsx`
- Delete: `components/teyvat/SceneView.tsx`
- Delete: `components/teyvat/TitleScreen.tsx`
- Delete: `components/teyvat/Ending.tsx`
- Delete: `test/teyvat/RevealCard.test.tsx`
- Delete: `test/teyvat/SceneView.test.tsx`

- [ ] **Step 1: grep for leftover imports**

```
grep -r --include="*.ts" --include="*.tsx" "Questionnaire\|SceneView\|RevealCard\|DirectionPicker\|TitleScreen\|AdventureLog\|BackButton\|Ending\.tsx" .
```

For each match, verify it's an old import we missed. Update or remove.

- [ ] **Step 2: Delete the files**

```bash
git rm components/teyvat/AdventureLog.tsx components/teyvat/BackButton.tsx \
       components/teyvat/RevealCard.tsx components/teyvat/DirectionPicker.tsx \
       components/teyvat/Questionnaire.tsx components/teyvat/SceneView.tsx \
       components/teyvat/TitleScreen.tsx components/teyvat/Ending.tsx \
       test/teyvat/RevealCard.test.tsx test/teyvat/SceneView.test.tsx
```

- [ ] **Step 3: Run all tests**

```
npm test
npm run lint
npm run build
```

All should pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(teyvat): remove deprecated phase-based components"
```

### Task 25: Update CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update the Runtime Notes section in CLAUDE.md**

Replace the `Generation Flow` and `Key Files` sections to reflect:
- The flow is no longer phase-based; it's a single scrolling document of stages.
- New stage components live in `components/teyvat/stages/`.
- `useAdventure.ts` exposes `currentStageIndex`, `answers`, `commitReveal`, `chooseChoice` (with branching), `switchToSibling`, `siblingsAt`, `takenChoicesAt`.
- Scene state is a tree (`SceneTree`), not an array. Active branch via `activeScenesOf(state)`.
- Reveal is the commit gate; pre-reveal questionnaire is mutable; post-reveal is sealed.
- Branching: new choice on a past scene forks; existing sibling switches; pager + arrow keys navigate.

- [ ] **Step 2: Update README.md briefly**

Add a paragraph to the Architecture/Flow section describing the snap-scroll model, three visual tiers, and branching scenes.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: align CLAUDE.md and README with snap-scroll redesign"
```

**🟢 Phase 6 complete. Cleanup done; docs aligned.**

---

## Phase 7 — Final acceptance

### Task 26: Manual end-to-end acceptance

- [ ] **Step 1: Run the full app**

```
npm run dev
```

Manually verify each acceptance criterion from [the spec](../specs/2026-05-09-snap-scroll-playable-redesign-design.md#acceptance-criteria):

1. Happy path works: questionnaire → reveal → 10 scenes → ending
2. Pre-reveal: scroll up, change Q3 — overwrites, no LLM call
3. Hit reveal commit; scroll up to questions — visibly sealed/disabled
4. Same-choice on current leaf advances normally
5. Different choice on past scene forks; pager appears; original branch reachable
6. Pager + arrow keys swap siblings; no LLM call when nodes exist
7. Long scene overflows; user scrolls within it; snap-scroll picks up at next stage
8. Per-Vision palette themes correctly (try at least Anemo + Pyro)
9. Refresh during run preserves active path AND tree (verify via DevTools localStorage)
10. Legacy adventure (manually inject the v1 shape) loads correctly

- [ ] **Step 2: Run all checks**

```
npm test
npm run lint
npm run build
```

- [ ] **Step 3: If issues found, file them as follow-up tasks**

For each failing acceptance criterion, add a follow-up task to a new section at the bottom of this plan. Don't mark this task complete until either all criteria pass or all gaps are documented as known follow-ups.

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix(teyvat): resolve acceptance issues from snap-scroll redesign"
```

---

## Risks & open issues to surface during execution

- **Snap-scroll on iOS Safari** — known to have quirks with `scroll-snap-stop`. If the long-scene scenario doesn't work on iOS, fall back to `scroll-snap-type: y proximity` and document.
- **Streaming text + auto-scroll** — if `scrollIntoView` is called while text is streaming into the destination stage, the scroll may be jumpy. Test this; debounce if needed.
- **Tree memory growth** — uncapped. If a session generates 50+ scenes, memory could matter. Out of MVP scope; flag for follow-up.
- **xAI portrait timing** — if the portrait arrives during the Wish-stage entry animation, the silhouette → image swap may flash. Crossfade with `transition: opacity` over 600ms.
- **Existing tests for prompts/parsers** — these should be unaffected. If they break, the bug is in this plan, not in those tests.

---

## Out of MVP — explicit follow-up tasks

(These were called out in the spec; tracking here for visibility. Not part of this plan's scope.)

- Per-element particle systems beyond wind (Pyro embers, Hydro droplets, Cryo snow, Electro sparks, Geo dust, Dendro petals).
- Cross-fade transitions when palette re-themes mid-run (e.g., on v2-wish reveal).
- Bookshelf rendering of full tree shape (currently shows active path only).
- Mobile-specific polish beyond stock CSS scroll-snap behavior.
