# Revolver Curate Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "Keep / Remove" card-at-a-time Curate phase with a Danganronpa-style kinetic "bullet catching" interaction. Fragments fly across the screen as bold typographic objects; the user catches them into a 6-shot HUD ammo counter; on FIRE a full-screen impact-typography beat transitions into denoising. Uncaught bullets ricochet back up to 3 fainter passes before vanishing. Wildcard mechanic is removed entirely.

**Architecture:** Generation model changes from `{ selected, wildcard-injected }` to `{ caught bullets in chamber order }`. Chamber order = loading order = denoising influence order. A new `BulletField` renders active bullets with Framer Motion. An `AmmoHUD` component (top-left HUD, not a literal revolver cylinder) shows 6 cartridge slots filling as bullets are caught. A `FireImpact` overlay plays the cinematic FIRE beat. All wildcard code paths deleted.

**Design direction:** Danganronpa UI *grammar* (typography-as-object, diagonal tilt, HUD chrome with bracketed labels, kinetic entrances, impact frames) applied to the existing warm editorial palette (ivory, moss, plum, ink). The Curate phase is the loud, performative middle of a quiet editorial sandwich — questionnaire → **ritual action** → narrative.

**Specific design calls (locked):**
1. Palette: keep existing warm ivory/moss/plum/ink. Do not shift to pink/black.
2. Revolver representation: HUD ammo counter top-left (`[ LOADED · 3/6 ]` + 6 cartridge icons), not a literal cylinder.
3. FIRE moment: full Danganronpa — ~800ms screen-fill impact typography, speed lines, shake, held beat, cut to denoising.
4. Fragment typography: chunky display serif (same family as existing app serif, but heavier weight).

**Tech Stack:** Next.js (App Router), React, TypeScript, **Framer Motion** for all motion choreography, inline SVG for cartridge icons and impact rays. Vitest + React Testing Library for unit tests (install if not present).

---

## Pre-Flight: Test Infrastructure

The repo has no existing test suite. Tasks below assume vitest; if the team later picks jest, swap the runner — assertions are framework-agnostic.

### Task 0: Set up test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `test/setup.ts`

- [ ] **Step 1: Install dev dependencies + Framer Motion**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install framer-motion
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Create test setup file**

Create `test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test script**

Modify `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Smoke test**

Create `test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```

Run: `npm test`
Expected: 1 passed

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts test/
git commit -m "test: add vitest + RTL setup"
```

---

## Phase 1: Domain Model (Types + Pure Logic)

Build the revolver data model and pure helpers first, fully tested, before any UI.

### Task 1: New types for revolver model

**Files:**
- Modify: `types/index.ts`
- Test: `test/types.test.ts` (compile-only check via tsc)

- [ ] **Step 1: Add new types to `types/index.ts`**

Append to `types/index.ts`:

```ts
export type BulletStatus =
  | "flying"      // currently on screen, catchable
  | "ricocheting" // mid-air after a pass, will re-enter
  | "caught"      // loaded into a chamber
  | "spent";      // passed 3 times uncaught, gone forever

export interface Bullet {
  id: number;
  text: string;
  status: BulletStatus;
  passCount: number;        // 0..3 — how many times it has flown past
  chamberIndex: number | null; // 0..5 if caught, else null
}

export const REVOLVER_CHAMBERS = 6;
export const MAX_BULLET_PASSES = 3;
```

- [ ] **Step 2: Remove obsolete types**

In `types/index.ts`, delete:
- `MergedNoisePlan` (lines 29-33 in current file) — wildcard mechanic is removed.
- The `mergeSource` field from `NoiseFragment` (keep `NoiseFragment` itself for the Scan phase output — it still represents raw fragments before they become `Bullet`s).
- `MergeRevealStage` (line 55) — the reveal animation belonged to wildcard.

Final `NoiseFragment`:

```ts
export interface NoiseFragment {
  id: number;
  text: string;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors from `types/index.ts`. (Other files will error — that's fine; Phase 2+ fixes them.)

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add Bullet model, drop wildcard types"
```

---

### Task 2: Pure revolver helpers

**Files:**
- Create: `lib/revolver.ts`
- Test: `test/revolver.test.ts`

- [ ] **Step 1: Write failing tests for `fragmentToBullet`**

Create `test/revolver.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  fragmentToBullet,
  catchBullet,
  ricochetBullet,
  chamberSnapshot,
  buildBulletSeed,
} from "@/lib/revolver";
import type { Bullet, NoiseFragment } from "@/types";

describe("fragmentToBullet", () => {
  it("creates a flying bullet with pass count 0", () => {
    const frag: NoiseFragment = { id: 1, text: "a door" };
    expect(fragmentToBullet(frag)).toEqual({
      id: 1,
      text: "a door",
      status: "flying",
      passCount: 0,
      chamberIndex: null,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- revolver`
Expected: FAIL — module `@/lib/revolver` not found.

- [ ] **Step 3: Implement `fragmentToBullet`**

Create `lib/revolver.ts`:

```ts
import type { Bullet, NoiseFragment } from "@/types";
import { MAX_BULLET_PASSES, REVOLVER_CHAMBERS } from "@/types";

export function fragmentToBullet(fragment: NoiseFragment): Bullet {
  return {
    id: fragment.id,
    text: fragment.text,
    status: "flying",
    passCount: 0,
    chamberIndex: null,
  };
}
```

- [ ] **Step 4: Verify test passes**

Run: `npm test -- revolver`
Expected: PASS (1 test)

- [ ] **Step 5: Write failing tests for `catchBullet`**

Append to `test/revolver.test.ts`:

```ts
describe("catchBullet", () => {
  it("marks bullet caught and assigns next free chamber index", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a", status: "flying", passCount: 0, chamberIndex: null },
      { id: 2, text: "b", status: "caught", passCount: 0, chamberIndex: 0 },
    ];
    const next = catchBullet(bullets, 1);
    expect(next.find((b) => b.id === 1)).toEqual({
      id: 1,
      text: "a",
      status: "caught",
      passCount: 0,
      chamberIndex: 1,
    });
  });

  it("is a no-op when all chambers full", () => {
    const bullets: Bullet[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      text: `${i}`,
      status: "caught" as const,
      passCount: 0,
      chamberIndex: i,
    }));
    const incoming: Bullet = {
      id: 99,
      text: "x",
      status: "flying",
      passCount: 0,
      chamberIndex: null,
    };
    const next = catchBullet([...bullets, incoming], 99);
    expect(next.find((b) => b.id === 99)?.status).toBe("flying");
  });

  it("is a no-op when bullet is not flying or ricocheting", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a", status: "spent", passCount: 3, chamberIndex: null },
    ];
    const next = catchBullet(bullets, 1);
    expect(next[0].status).toBe("spent");
  });
});
```

- [ ] **Step 6: Run tests to verify failure**

Run: `npm test -- revolver`
Expected: FAIL — `catchBullet` not exported.

- [ ] **Step 7: Implement `catchBullet`**

Append to `lib/revolver.ts`:

```ts
export function catchBullet(bullets: Bullet[], bulletId: number): Bullet[] {
  const caughtCount = bullets.filter((b) => b.status === "caught").length;
  if (caughtCount >= REVOLVER_CHAMBERS) return bullets;
  return bullets.map((b) => {
    if (b.id !== bulletId) return b;
    if (b.status !== "flying" && b.status !== "ricocheting") return b;
    return { ...b, status: "caught", chamberIndex: caughtCount };
  });
}
```

- [ ] **Step 8: Verify tests pass**

Run: `npm test -- revolver`
Expected: PASS (4 tests)

- [ ] **Step 9: Write failing tests for `ricochetBullet`**

Append to `test/revolver.test.ts`:

```ts
describe("ricochetBullet", () => {
  it("increments pass count and sets ricocheting when under limit", () => {
    const b: Bullet = { id: 1, text: "a", status: "flying", passCount: 0, chamberIndex: null };
    expect(ricochetBullet(b)).toEqual({ ...b, status: "ricocheting", passCount: 1 });
  });

  it("marks spent at MAX_BULLET_PASSES", () => {
    const b: Bullet = { id: 1, text: "a", status: "ricocheting", passCount: 2, chamberIndex: null };
    expect(ricochetBullet(b)).toEqual({ ...b, status: "spent", passCount: 3 });
  });

  it("does not touch caught bullets", () => {
    const b: Bullet = { id: 1, text: "a", status: "caught", passCount: 0, chamberIndex: 0 };
    expect(ricochetBullet(b)).toBe(b);
  });
});
```

- [ ] **Step 10: Run tests to verify failure**

Run: `npm test -- revolver`
Expected: FAIL — `ricochetBullet` not exported.

- [ ] **Step 11: Implement `ricochetBullet`**

Append to `lib/revolver.ts`:

```ts
export function ricochetBullet(bullet: Bullet): Bullet {
  if (bullet.status === "caught" || bullet.status === "spent") return bullet;
  const nextPassCount = bullet.passCount + 1;
  if (nextPassCount >= MAX_BULLET_PASSES) {
    return { ...bullet, status: "spent", passCount: nextPassCount };
  }
  return { ...bullet, status: "ricocheting", passCount: nextPassCount };
}
```

- [ ] **Step 12: Verify tests pass**

Run: `npm test -- revolver`
Expected: PASS (7 tests)

- [ ] **Step 13: Write failing tests for `chamberSnapshot` and `buildBulletSeed`**

Append to `test/revolver.test.ts`:

```ts
describe("chamberSnapshot", () => {
  it("returns caught bullets ordered by chamberIndex, filling to 6 with null", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a", status: "caught", passCount: 0, chamberIndex: 2 },
      { id: 2, text: "b", status: "caught", passCount: 1, chamberIndex: 0 },
      { id: 3, text: "c", status: "flying", passCount: 0, chamberIndex: null },
    ];
    const snap = chamberSnapshot(bullets);
    expect(snap).toHaveLength(6);
    expect(snap[0]?.id).toBe(2);
    expect(snap[1]).toBeNull();
    expect(snap[2]?.id).toBe(1);
    expect(snap[3]).toBeNull();
  });
});

describe("buildBulletSeed", () => {
  it("serializes caught bullets by chamber order into N::text lines", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a door", status: "caught", passCount: 0, chamberIndex: 1 },
      { id: 2, text: "red dust", status: "caught", passCount: 0, chamberIndex: 0 },
    ];
    expect(buildBulletSeed(bullets)).toBe("1::red dust\n2::a door");
  });
});
```

- [ ] **Step 14: Run tests to verify failure**

Run: `npm test -- revolver`
Expected: FAIL — helpers not exported.

- [ ] **Step 15: Implement both helpers**

Append to `lib/revolver.ts`:

```ts
export function chamberSnapshot(bullets: Bullet[]): (Bullet | null)[] {
  const snapshot: (Bullet | null)[] = Array(REVOLVER_CHAMBERS).fill(null);
  for (const b of bullets) {
    if (b.status === "caught" && b.chamberIndex !== null && b.chamberIndex < REVOLVER_CHAMBERS) {
      snapshot[b.chamberIndex] = b;
    }
  }
  return snapshot;
}

export function buildBulletSeed(bullets: Bullet[]): string {
  return chamberSnapshot(bullets)
    .filter((b): b is Bullet => b !== null)
    .map((b, i) => `${i + 1}::${b.text}`)
    .join("\n");
}
```

- [ ] **Step 16: Verify all tests pass**

Run: `npm test -- revolver`
Expected: PASS (9 tests)

- [ ] **Step 17: Commit**

```bash
git add lib/revolver.ts test/revolver.test.ts
git commit -m "feat(revolver): add pure helpers for catch/ricochet/seed"
```

---

### Task 3: Remove wildcard from prompts

**Files:**
- Modify: `lib/prompts.ts:251-284` (delete `buildMergedNoisePlan`, `buildMergedNoiseSeed`, `shuffleFragments` if only used here)
- Modify: `lib/prompts.ts` (anywhere else referencing wildcard)

- [ ] **Step 1: Identify all wildcard references in prompts**

Run: `grep -n "wildcard\|Merged\|shuffleFragments" lib/prompts.ts`

Record the line numbers. You will delete or adapt each.

- [ ] **Step 2: Delete the three helper functions**

From `lib/prompts.ts`, delete:
- `shuffleFragments` (lines ~242-249)
- `buildMergedNoisePlan` (lines ~251-280)
- `buildMergedNoiseSeed` (lines ~282-284)

These are replaced by `buildBulletSeed` in `lib/revolver.ts`.

- [ ] **Step 3: Remove any prompt text mentioning "wildcard" or "system override"**

Search: `grep -n "wildcard\|override" lib/prompts.ts`

For each match in prompt template strings, rewrite the surrounding text so it describes the seed as "fragments the user caught and loaded into chamber order" without any wildcard framing. Do not leave "used to be wildcard" comments.

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit 2>&1 | grep "lib/prompts.ts"`
Expected: No errors in `lib/prompts.ts` itself (other files still error — fixed next).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts
git commit -m "refactor(prompts): remove wildcard helpers, replaced by revolver"
```

---

## Phase 2: Hook — State Machine for Bullets

### Task 4: Replace curate logic in `useGeneration`

**Files:**
- Modify: `hooks/useGeneration.ts`
- Test: `test/useGeneration.test.tsx`

This is the largest task. Break it into sub-steps.

- [ ] **Step 1: Write a failing hook test for scan → bullets transition**

Create `test/useGeneration.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeneration } from "@/hooks/useGeneration";

const mockFetch = vi.fn();
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

describe("useGeneration bullet lifecycle", () => {
  it("converts scanned fragments into flying bullets", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        content: [{ type: "text", text: "1:: a door\n2:: red dust\n3:: a held breath" }],
      }),
    });

    const { result } = renderHook(() =>
      useGeneration({
        /* minimal props — see hook signature */
      } as any)
    );

    await act(async () => {
      await result.current.scanNoiseFragments();
    });

    expect(result.current.bullets).toHaveLength(3);
    expect(result.current.bullets.every((b) => b.status === "flying")).toBe(true);
  });
});
```

Note: The test imports `bullets` and calls `scanNoiseFragments` — both must exist on the hook's return. That's enforced by the test failing until you add them.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- useGeneration`
Expected: FAIL — `bullets` is undefined on the hook result.

- [ ] **Step 3: Replace state variables in the hook**

In `hooks/useGeneration.ts`, delete:
- `noiseFragments`, `setNoiseFragments` state
- `keptNoiseFragments`, `setKeptNoiseFragments` state
- `currentNoiseIndex`, `setCurrentNoiseIndex` state
- `mergedNoisePlan`, `setMergedNoisePlan` state
- The `enableWildcard` prop (remove from props interface and all call sites)
- The `decideCurrentNoise` function
- The `lockNoiseSelection` function
- Any reference to `buildMergedNoisePlan`, `buildMergedNoiseSeed` — replace the one site in `generate()` (line ~403-404) with `buildBulletSeed(bullets)`.

Add:

```ts
const [bullets, setBullets] = useState<Bullet[]>([]);
```

Import from `@/types`: `Bullet`.
Import from `@/lib/revolver`: `fragmentToBullet`, `catchBullet`, `ricochetBullet`, `buildBulletSeed`.

- [ ] **Step 4: Rewrite `scanNoiseFragments` to produce bullets**

Replace the body of `scanNoiseFragments` (around line 354) so that after parsing fragments, instead of `setNoiseFragments(parsedNoise.map(...))` it does:

```ts
const scanned: NoiseFragment[] = parsedNoise.map((text, i) => ({ id: i + 1, text }));
setBullets(scanned.map(fragmentToBullet));
setRunPhase("reviewing");
```

Delete any other state resets in that function that referenced the deleted variables.

- [ ] **Step 5: Add new actions for catch/ricochet/reload/fire**

Append inside the hook body, near the other actions:

```ts
const catchBulletAction = (bulletId: number) => {
  if (isGenerating) return;
  setBullets((prev) => {
    const next = catchBullet(prev, bulletId);
    const caught = next.filter((b) => b.status === "caught").length;
    if (caught >= REVOLVER_CHAMBERS) {
      setRunPhase("ready");
    }
    return next;
  });
};

const ricochetUncaught = () => {
  setBullets((prev) => prev.map(ricochetBullet));
};

const reloadScan = async () => {
  setBullets([]);
  await scanNoiseFragments();
};
```

Import `REVOLVER_CHAMBERS` from `@/types`.

- [ ] **Step 6: Update `generate()` to use `buildBulletSeed`**

Around line 403-404, replace:

```ts
const activeMergedNoisePlan =
  mergedNoisePlan ?? buildMergedNoisePlan(keptNoiseFragments, noiseFragments, enableWildcard);
const mergedNoiseSeed = buildMergedNoiseSeed(activeMergedNoisePlan.fragments);
```

With:

```ts
const mergedNoiseSeed = buildBulletSeed(bullets);
```

Update the guard at line 398: `if (generationLockRef.current || keptNoiseFragments.length === 0) return;` becomes:

```ts
if (generationLockRef.current || bullets.filter((b) => b.status === "caught").length === 0) return;
```

- [ ] **Step 7: Update hook return value**

Modify the return object (around line 471-490). Remove:
- `noiseFragments`, `keptNoiseFragments`, `currentNoiseFragment`
- `mergedNoisePlan`
- `canRemoveCurrentNoise`, `canKeepCurrentNoise`, `keepSlotsLeft`, `removedNoiseCount`
- `decideCurrentNoise`

Add:
- `bullets`
- `catchBullet: catchBulletAction`
- `ricochetUncaught`
- `reloadScan`

- [ ] **Step 8: Run hook test to verify pass**

Run: `npm test -- useGeneration`
Expected: PASS (1 test)

If the test fails because of missing mock props, add the minimal prop stub to the test. The hook's prop interface is the source of truth.

- [ ] **Step 9: Add test for catch action**

Append to `test/useGeneration.test.tsx`:

```tsx
it("catch moves bullet to caught status with chamber index 0", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: new Headers(),
    json: async () => ({ content: [{ type: "text", text: "1:: a\n2:: b" }] }),
  });
  const { result } = renderHook(() => useGeneration({ /* props */ } as any));
  await act(async () => { await result.current.scanNoiseFragments(); });
  act(() => { result.current.catchBullet(1); });
  const caught = result.current.bullets.find((b) => b.id === 1);
  expect(caught?.status).toBe("caught");
  expect(caught?.chamberIndex).toBe(0);
});
```

Run: `npm test -- useGeneration`
Expected: PASS (2 tests).

- [ ] **Step 10: Add test for auto-transition to `ready` when 6 caught**

Append:

```tsx
it("transitions to ready phase when 6 bullets are caught", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: new Headers(),
    json: async () => ({
      content: [{ type: "text", text: "1:: a\n2:: b\n3:: c\n4:: d\n5:: e\n6:: f\n7:: g" }],
    }),
  });
  const { result } = renderHook(() => useGeneration({ /* props */ } as any));
  await act(async () => { await result.current.scanNoiseFragments(); });
  act(() => {
    for (let i = 1; i <= 6; i++) result.current.catchBullet(i);
  });
  expect(result.current.runPhase).toBe("ready");
});
```

Run: `npm test -- useGeneration`
Expected: PASS (3 tests).

- [ ] **Step 11: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in files that haven't been updated yet (`app/page.tsx`, `components/NoiseSeedPanel.tsx`, `components/WorkflowRail.tsx`, etc.). Record the list — Phase 3 fixes them.

- [ ] **Step 12: Commit**

```bash
git add hooks/useGeneration.ts test/useGeneration.test.tsx
git commit -m "feat(hook): replace curate state with bullet lifecycle"
```

---

## Phase 3: UI Components

### Task 4b: Motion + palette constants

**Files:**
- Create: `lib/motion.ts`

All timing, easing, and Danganronpa-grammar constants live here so they can be tuned in one place.

- [ ] **Step 1: Create the constants file**

Create `lib/motion.ts`:

```ts
// All motion knobs for the Curate phase. Tweak here, see everywhere.

export const motion = {
  // Bullet flight
  bulletDurationSec: 2.5,
  ricochetDurationSec: 3.5,
  bulletStaggerSec: 0.35,
  bulletVerticalBobPx: 14,     // sinusoidal drift amplitude
  bulletTiltMaxDeg: 5,          // random tilt per bullet

  // Catch (bullet → HUD)
  catchSpring: { stiffness: 280, damping: 24, mass: 0.9 },
  catchScalePulse: 1.22,        // chamber pops when filled
  catchPulseDurationMs: 180,

  // Ricochet fade curve
  ricochetOpacity: [1, 0.55, 0.22, 0] as const, // pass 0..3

  // FIRE impact beat
  firePreDelayMs: 80,           // HUD locks before flash
  fireFlashMs: 80,              // white/ivory flash
  fireImpactHoldMs: 520,        // full-screen typography held
  fireShakeMs: 260,
  fireShakeAmplitudePx: 6,
  fireTotalMs: 840,             // sum including exit

  // Reload
  reloadSpinDurationMs: 420,
} as const;

// Danganronpa-grammar type scale (applied to bullet + impact text)
export const kineticType = {
  bulletMinPx: 18,
  bulletMaxPx: 30,              // charge/weight varies within range
  bulletWeight: 700,
  bulletLetterSpacing: "-0.01em",
  impactPx: 128,                // full-screen FIRE text
  impactWeight: 900,
  impactLetterSpacing: "-0.04em",
  impactTiltDeg: -6,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add lib/motion.ts
git commit -m "feat(motion): central tuning knobs for Curate phase"
```

---

### Task 5: Build `AmmoHUD` component (top-left 6-shot HUD)

Replaces the earlier "Revolver cylinder" concept. Not a literal revolver — a Danganronpa-style heads-up display with a bracketed counter and six cartridge icons that fill in catch order.

**Files:**
- Create: `components/AmmoHUD.tsx`
- Create: `components/CartridgeIcon.tsx` (inline SVG, reusable)
- Test: `test/AmmoHUD.test.tsx`

- [ ] **Step 1: Build `CartridgeIcon` — inline SVG, two states**

Create `components/CartridgeIcon.tsx`:

```tsx
"use client";
import { theme } from "@/lib/theme";

interface CartridgeIconProps {
  loaded: boolean;
  size?: number;
}

// Side profile of a brass cartridge. `loaded=false` = ghosted outline only.
export function CartridgeIcon({ loaded, size = 22 }: CartridgeIconProps) {
  const fill = loaded ? theme.plum72 : "transparent";
  const stroke = loaded ? theme.plum72 : theme.moss62;
  return (
    <svg
      width={size * 2.2}
      height={size}
      viewBox="0 0 44 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <rect x="1" y="3" width="28" height="14" rx="1.5" stroke={stroke} strokeWidth="1.4" fill={fill} />
      <path d="M29 3 L40 6 L40 14 L29 17 Z" stroke={stroke} strokeWidth="1.4" fill={fill} />
      <line x1="5" y1="3" x2="5" y2="17" stroke={stroke} strokeWidth="1" opacity={loaded ? 0.4 : 0.25} />
    </svg>
  );
}
```

- [ ] **Step 2: Write failing tests for `AmmoHUD`**

Create `test/AmmoHUD.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmmoHUD } from "@/components/AmmoHUD";
import type { Bullet } from "@/types";

describe("AmmoHUD", () => {
  it("renders 6 cartridge slots", () => {
    render(<AmmoHUD bullets={[]} />);
    expect(screen.getAllByTestId("cartridge-slot")).toHaveLength(6);
  });

  it("shows counter in bracketed N/6 format", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a", status: "caught", passCount: 0, chamberIndex: 0 },
      { id: 2, text: "b", status: "caught", passCount: 0, chamberIndex: 1 },
    ];
    render(<AmmoHUD bullets={bullets} />);
    expect(screen.getByText(/LOADED · 2 \/ 6/)).toBeInTheDocument();
  });

  it("marks only caught chambers as loaded", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "a", status: "caught", passCount: 0, chamberIndex: 0 },
      { id: 2, text: "b", status: "caught", passCount: 0, chamberIndex: 2 },
    ];
    render(<AmmoHUD bullets={bullets} />);
    const slots = screen.getAllByTestId("cartridge-slot");
    expect(slots[0]).toHaveAttribute("data-loaded", "true");
    expect(slots[1]).toHaveAttribute("data-loaded", "false");
    expect(slots[2]).toHaveAttribute("data-loaded", "true");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- AmmoHUD`
Expected: FAIL — component missing.

- [ ] **Step 4: Implement `AmmoHUD`**

Create `components/AmmoHUD.tsx`:

```tsx
"use client";
import { motion as m } from "framer-motion";
import { chamberSnapshot } from "@/lib/revolver";
import { motion as motionTokens } from "@/lib/motion";
import { CartridgeIcon } from "@/components/CartridgeIcon";
import { theme, mono } from "@/lib/theme";
import type { Bullet } from "@/types";
import { REVOLVER_CHAMBERS } from "@/types";

interface AmmoHUDProps {
  bullets: Bullet[];
}

export function AmmoHUD({ bullets }: AmmoHUDProps) {
  const chambers = chamberSnapshot(bullets);
  const caughtCount = chambers.filter(Boolean).length;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 5,
        padding: "10px 14px",
        background: "rgba(255,250,240,0.92)",
        border: `1.5px solid ${theme.ink8}`,
        borderRadius: 4,
        boxShadow: `3px 3px 0 ${theme.moss62}`, // Danganronpa-style offset drop
        transform: "rotate(-1.2deg)",            // diagonal tilt
      }}
      data-testid="ammo-hud"
    >
      <div
        style={{
          fontSize: 10,
          ...mono,
          letterSpacing: 1.2,
          color: theme.ink8,
          marginBottom: 6,
          fontWeight: 700,
        }}
      >
        [ LOADED · {caughtCount} / {REVOLVER_CHAMBERS} ]
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {chambers.map((bullet, i) => {
          const loaded = bullet !== null;
          return (
            <m.div
              key={i}
              data-testid="cartridge-slot"
              data-loaded={loaded}
              initial={false}
              animate={
                loaded
                  ? { scale: [1, motionTokens.catchScalePulse, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: motionTokens.catchPulseDurationMs / 1000 }}
            >
              <CartridgeIcon loaded={loaded} />
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify tests pass**

Run: `npm test -- AmmoHUD`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add components/AmmoHUD.tsx components/CartridgeIcon.tsx test/AmmoHUD.test.tsx
git commit -m "feat(ui): AmmoHUD + CartridgeIcon Danganronpa-style HUD"
```

---

### Task 6: Build `BulletField` component (Framer Motion, kinetic typography)

Bullets are bold display-serif text objects (not pills). They drift across at varied heights with slight vertical bob and slight rotation — Danganronpa grammar. Motion uses Framer Motion for everything.

**Files:**
- Create: `components/BulletField.tsx`
- Test: `test/BulletField.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `test/BulletField.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulletField } from "@/components/BulletField";
import type { Bullet } from "@/types";

describe("BulletField", () => {
  it("renders only flying and ricocheting bullets", () => {
    const bullets: Bullet[] = [
      { id: 1, text: "flying-1", status: "flying", passCount: 0, chamberIndex: null },
      { id: 2, text: "caught-1", status: "caught", passCount: 0, chamberIndex: 0 },
      { id: 3, text: "spent-1", status: "spent", passCount: 3, chamberIndex: null },
      { id: 4, text: "ricochet-1", status: "ricocheting", passCount: 1, chamberIndex: null },
    ];
    render(<BulletField bullets={bullets} onCatch={() => {}} />);
    expect(screen.getByText("flying-1")).toBeInTheDocument();
    expect(screen.getByText("ricochet-1")).toBeInTheDocument();
    expect(screen.queryByText("caught-1")).not.toBeInTheDocument();
    expect(screen.queryByText("spent-1")).not.toBeInTheDocument();
  });

  it("calls onCatch with bullet id when clicked", async () => {
    const onCatch = vi.fn();
    const bullets: Bullet[] = [
      { id: 7, text: "click-me", status: "flying", passCount: 0, chamberIndex: null },
    ];
    render(<BulletField bullets={bullets} onCatch={onCatch} />);
    await userEvent.click(screen.getByText("click-me"));
    expect(onCatch).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- BulletField`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement `BulletField` with Framer Motion**

Create `components/BulletField.tsx`:

```tsx
"use client";
import { motion as m } from "framer-motion";
import { theme } from "@/lib/theme";
import { motion as motionTokens, kineticType } from "@/lib/motion";
import type { Bullet } from "@/types";

interface BulletFieldProps {
  bullets: Bullet[];
  onCatch: (id: number) => void;
  onPassComplete?: (id: number) => void;
}

// Deterministic pseudo-random from bullet id — so a given bullet's tilt / Y / size
// stays stable across renders.
function hashBullet(id: number): { tilt: number; yPct: number; sizePx: number } {
  const seed = (id * 2654435761) >>> 0; // fast integer hash
  const r1 = ((seed >>> 0) % 1000) / 1000;
  const r2 = (((seed * 7) >>> 0) % 1000) / 1000;
  const r3 = (((seed * 13) >>> 0) % 1000) / 1000;
  return {
    tilt: (r1 - 0.5) * 2 * kineticType.bulletTiltMaxDeg,
    yPct: 8 + r2 * 74,
    sizePx:
      kineticType.bulletMinPx +
      r3 * (kineticType.bulletMaxPx - kineticType.bulletMinPx),
  };
}

export function BulletField({ bullets, onCatch, onPassComplete }: BulletFieldProps) {
  const active = bullets.filter(
    (b) => b.status === "flying" || b.status === "ricocheting"
  );

  return (
    <div
      aria-label="bullet-field"
      style={{
        position: "relative",
        height: "min(56vh, 420px)",
        overflow: "hidden",
        borderRadius: 6,
        background: "rgba(255,250,240,0.35)",
        border: `1.5px solid ${theme.ink8}`,
        boxShadow: `3px 3px 0 ${theme.moss62}`,
      }}
    >
      {active.map((bullet, i) => {
        const isRicochet = bullet.status === "ricocheting";
        const opacity = motionTokens.ricochetOpacity[bullet.passCount] ?? 0;
        const { tilt, yPct, sizePx } = hashBullet(bullet.id);
        const duration = isRicochet
          ? motionTokens.ricochetDurationSec
          : motionTokens.bulletDurationSec;
        const fromX = isRicochet ? "120vw" : "-120vw";
        const toX = isRicochet ? "-120vw" : "120vw";

        return (
          <m.button
            key={`${bullet.id}-${bullet.passCount}-${bullet.status}`}
            onClick={() => onCatch(bullet.id)}
            onAnimationComplete={() => onPassComplete?.(bullet.id)}
            initial={{ x: fromX, opacity: 0 }}
            animate={{
              x: toX,
              opacity: [0, opacity, opacity, 0],
              y: [0, -motionTokens.bulletVerticalBobPx, 0, motionTokens.bulletVerticalBobPx, 0],
            }}
            transition={{
              x: { duration, ease: "linear", delay: i * motionTokens.bulletStaggerSec },
              opacity: {
                duration,
                times: [0, 0.08, 0.92, 1],
                delay: i * motionTokens.bulletStaggerSec,
              },
              y: {
                duration,
                ease: "easeInOut",
                delay: i * motionTokens.bulletStaggerSec,
              },
            }}
            whileHover={{ scale: 1.08 }}
            style={{
              position: "absolute",
              top: `${yPct}%`,
              left: 0,
              padding: "4px 10px",
              background: "transparent",
              border: "none",
              color: theme.ink8,
              fontSize: sizePx,
              fontWeight: kineticType.bulletWeight,
              letterSpacing: kineticType.bulletLetterSpacing,
              fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transform: `rotate(${tilt}deg)`,
              textShadow: `2px 2px 0 ${theme.plumBg07}`,
            }}
          >
            {bullet.text}
          </m.button>
        );
      })}
    </div>
  );
}
```

Notes:
- `key` includes `passCount` + `status` so ricochet re-mounts the element and Framer Motion re-runs its entrance from `fromX`.
- `textShadow` gives the Danganronpa offset-stamp feel without a full double-outline (which would need stroke).
- `whileHover` scale gives a cheap but satisfying "catchable" cue.

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- BulletField`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/BulletField.tsx test/BulletField.test.tsx
git commit -m "feat(ui): BulletField kinetic typography + Framer Motion"
```

---

### Task 7: Delete `NoiseSeedPanel`

`onPassComplete` is already implemented in Task 6 via Framer Motion's `onAnimationComplete`. This task is now just cleanup.

**Files:**
- Delete: `components/NoiseSeedPanel.tsx`

- [ ] **Step 1: Delete `NoiseSeedPanel`**

```bash
git rm components/NoiseSeedPanel.tsx
```

- [ ] **Step 2: Verify no remaining imports**

Run: `grep -rn "NoiseSeedPanel" app/ components/ hooks/ lib/`
Expected: zero hits (if any remain, they'll be cleaned up in Task 8).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(ui): remove NoiseSeedPanel (replaced by BulletField + AmmoHUD)"
```

---

### Task 7b: `FireImpact` overlay — the cinematic FIRE beat

Full-screen Danganronpa-style impact frame when the user hits FIRE. ~840ms total: lock → flash → screen-fill impact typography → hold → exit → cut to denoising view.

**Files:**
- Create: `components/FireImpact.tsx`
- Test: `test/FireImpact.test.tsx`

- [ ] **Step 1: Write failing test**

Create `test/FireImpact.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FireImpact } from "@/components/FireImpact";
import { motion as motionTokens } from "@/lib/motion";

describe("FireImpact", () => {
  it("renders the impact label when active", () => {
    render(<FireImpact active={true} onComplete={() => {}} />);
    expect(screen.getByText(/FIRE/i)).toBeInTheDocument();
  });

  it("renders nothing when inactive", () => {
    const { container } = render(<FireImpact active={false} onComplete={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onComplete after fireTotalMs", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<FireImpact active={true} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(motionTokens.fireTotalMs + 50);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- FireImpact`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement `FireImpact`**

Create `components/FireImpact.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { motion as m, AnimatePresence } from "framer-motion";
import { motion as motionTokens, kineticType } from "@/lib/motion";
import { theme } from "@/lib/theme";

interface FireImpactProps {
  active: boolean;
  onComplete: () => void;
}

export function FireImpact({ active, onComplete }: FireImpactProps) {
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(onComplete, motionTokens.fireTotalMs);
    return () => window.clearTimeout(t);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <m.div
          key="fire-impact-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Stage 1: ivory flash */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: motionTokens.fireFlashMs / 1000, times: [0, 0.3, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,250,240,0.96)",
            }}
          />

          {/* Stage 2: radial speed lines (SVG) */}
          <m.svg
            viewBox="-50 -50 100 100"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 0.9, 0] }}
            transition={{
              duration: motionTokens.fireImpactHoldMs / 1000,
              delay: motionTokens.fireFlashMs / 1000,
            }}
            style={{
              position: "absolute",
              width: "140vmin",
              height: "140vmin",
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2;
              const len = 28 + ((i * 37) % 18);
              const x2 = Math.cos(angle) * len;
              const y2 = Math.sin(angle) * len;
              return (
                <line
                  key={i}
                  x1={Math.cos(angle) * 12}
                  y1={Math.sin(angle) * 12}
                  x2={x2}
                  y2={y2}
                  stroke={theme.ink8}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              );
            })}
          </m.svg>

          {/* Stage 3: impact typography + shake */}
          <m.div
            initial={{ scale: 0.6, opacity: 0, x: 0 }}
            animate={{
              scale: [0.6, 1.12, 1],
              opacity: [0, 1, 1, 0],
              x: [0, -motionTokens.fireShakeAmplitudePx, motionTokens.fireShakeAmplitudePx, 0],
            }}
            transition={{
              duration: motionTokens.fireImpactHoldMs / 1000,
              delay: motionTokens.fireFlashMs / 1000,
              times: [0, 0.2, 0.7, 1],
            }}
            style={{
              fontSize: kineticType.impactPx,
              fontWeight: kineticType.impactWeight,
              letterSpacing: kineticType.impactLetterSpacing,
              color: theme.ink8,
              fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
              transform: `rotate(${kineticType.impactTiltDeg}deg)`,
              textShadow: `6px 6px 0 ${theme.plum72}`,
              WebkitTextStroke: `2px ${theme.ink8}`,
              padding: "0 24px",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            FIRE
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- FireImpact`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/FireImpact.tsx test/FireImpact.test.tsx
git commit -m "feat(ui): FireImpact cinematic beat for FIRE action"
```

---

## Phase 4: Page Integration

### Task 8: Wire `BulletField` + `AmmoHUD` + `FireImpact` into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Modify: `hooks/useGeneration.ts` (add `ricochetSingle` action)
- Modify: `components/WorkflowRail.tsx` (remove wildcard-related step labels)
- Modify: `i18n/index.tsx` (add new keys)

- [ ] **Step 1: Find all references to removed symbols**

```bash
grep -n "NoiseSeedPanel\|mergedNoisePlan\|enableWildcard\|keptNoiseFragments\|decideCurrentNoise\|noiseFragments\|Revolver" app/page.tsx
grep -n "NoiseSeedPanel\|mergedNoisePlan\|enableWildcard\|Revolver" components/WorkflowRail.tsx
```

Record every line — each must be updated or deleted.

- [ ] **Step 2: Add `ricochetSingle` to `useGeneration`**

In `hooks/useGeneration.ts`, alongside `ricochetUncaught`:

```ts
const ricochetSingle = (bulletId: number) => {
  setBullets((prev) =>
    prev.map((b) => (b.id === bulletId ? ricochetBullet(b) : b))
  );
};
```

Export `ricochetSingle` from the hook's return. (Keep `ricochetUncaught` — still useful for `reloadScan`.)

- [ ] **Step 3: Replace imports + JSX in `app/page.tsx`**

Remove: `NoiseSeedPanel` import.

Add imports:

```tsx
import { useState } from "react";
import { BulletField } from "@/components/BulletField";
import { AmmoHUD } from "@/components/AmmoHUD";
import { FireImpact } from "@/components/FireImpact";
```

In the `useGeneration` destructure, replace old fields with the new ones:

```tsx
const {
  runPhase,
  bullets,
  catchBullet,
  ricochetSingle,
  ricochetUncaught,
  reloadScan,
  scanNoiseFragments,
  generate,
  // ...other unchanged fields (error, isGenerating, trajectories, etc.)
} = useGeneration({ /* props without enableWildcard */ });
```

Remove `enableWildcard` from the props object passed to `useGeneration`.

- [ ] **Step 4: Add local FIRE choreography state**

In `app/page.tsx` body:

```tsx
const [fireImpactActive, setFireImpactActive] = useState(false);

const handleFire = () => {
  setFireImpactActive(true);
};

const handleFireImpactComplete = () => {
  setFireImpactActive(false);
  generate();
};

const handlePassComplete = (bulletId: number) => {
  ricochetSingle(bulletId);
};
```

Rationale: the FIRE button *does not* call `generate()` directly. It plays the impact overlay, and the overlay's completion callback starts generation. That decouples cinematic beat from data flow and lets us test them separately.

- [ ] **Step 5: Replace the curate-phase JSX block**

Replace the old `<NoiseSeedPanel … />` region with:

```tsx
{(runPhase === "reviewing" || runPhase === "ready") && (
  <div style={{ position: "relative" }}>
    <AmmoHUD bullets={bullets} />
    <BulletField
      bullets={bullets}
      onCatch={catchBullet}
      onPassComplete={handlePassComplete}
    />
  </div>
)}

<FireImpact active={fireImpactActive} onComplete={handleFireImpactComplete} />
```

Note: `FireImpact` lives outside the curate block so it can paint over anything (z-index 9999). It should be near the root of the page tree.

- [ ] **Step 6: Replace the generate button with RELOAD / FIRE**

Find the existing generate-button region and replace:

```tsx
{runPhase === "reviewing" && (
  <button
    onClick={reloadScan}
    disabled={isGenerating}
    style={buttonStyles.secondary}
  >
    [ {t("bullet_reload")} ]
  </button>
)}
{runPhase === "ready" && (
  <button
    onClick={handleFire}
    disabled={isGenerating || fireImpactActive}
    style={buttonStyles.fire}
  >
    [ {t("bullet_fire")} ]
  </button>
)}
```

If `buttonStyles.fire` does not exist, add it near the existing button style definitions: bold weight, slight tilt (`transform: "rotate(-1deg)"`), offset drop shadow (`boxShadow: "3px 3px 0 ..."`), bracketed text already provided by the template. Keep palette from the locked choice (ivory/moss/plum/ink) — no pink.

- [ ] **Step 7: Add i18n keys**

In `i18n/index.tsx`, add to every language dictionary (en, zh, ja, ko if present):

```ts
bullet_reload: "RELOAD",     // en
bullet_fire: "FIRE",          // en
ammo_loaded_label: "LOADED",  // en — used by AmmoHUD; swap if you localize
curate_stage_hint: "Catch the bullets. Load six. Fire.",  // en
```

Provide translations for each language. Keep the bracketed style in i18n values (or wrap in brackets at the call site, as shown in Step 6).

- [ ] **Step 8: Update `WorkflowRail`**

Open `components/WorkflowRail.tsx`. Remove any step label / description referring to "wildcard" or "merge". Three stages stay: Scan → Curate → Denoise. Replace the Curate step's i18n key value with `curate_stage_hint`.

If `WorkflowRail` renders any per-step animation or label tied to removed state (`currentNoiseFragment`, `mergedNoisePlan`), delete those branches.

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere.

- [ ] **Step 10: Run all tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 11: Run lint**

Run: `npm run lint`
Expected: pass.

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors anywhere.

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: ALL PASS.

- [ ] **Step 12: Manual smoke test (Danganronpa choreography check)**

Run: `npm run dev`

In a browser at `http://localhost:3000`:
1. Fill out the questionnaire and trigger the Scan phase.
2. Verify bullets fly across the screen as **bold display-serif text objects** (not pills), with slight rotation, varied size, and vertical bob. Each has a subtle plum-colored offset text-shadow.
3. Verify the `AmmoHUD` sits top-left with bracketed `[ LOADED · 0 / 6 ]` label and 6 ghosted cartridge icons. It is slightly tilted (~-1.2°) with an offset drop shadow.
4. Click 3 bullets. Verify: each one pops out of flight, the corresponding cartridge icon fills (plum), and the counter increments — each fill does a small scale-pulse.
5. Let uncaught bullets finish their pass. Verify they re-enter from the right at lower opacity (~55%), moving left, slower (~3.5s). After the third pass they disappear permanently.
6. Catch 6 bullets total. Verify the phase changes to `ready` — the RELOAD button hides, the FIRE button appears (bracketed `[ FIRE ]`, slight tilt, offset shadow).
7. Click **FIRE**. Verify the full FireImpact beat:
   - Frame 1 (~80ms): ivory flash covers the screen.
   - Frame 2 (~300ms): radial ink speed lines burst outward behind.
   - Frame 3 (~520ms): giant tilted "FIRE" display-serif typography slams in with plum offset shadow, shakes ±6px horizontally, then fades.
   - Frame 4: overlay dismisses and denoising begins.
8. Verify the denoising output reflects seed order from the revolver (chamber 0 first).
9. Start over. Click RELOAD mid-catch. Verify a new scan starts and the HUD resets to `0 / 6`.

Record any bug; fix before proceeding.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(page): wire Danganronpa-style BulletField + AmmoHUD + FireImpact"
```

---

## Phase 5: Cleanup & Docs

### Task 9: Remove dead code and i18n keys

**Files:**
- Modify: `i18n/index.tsx`
- Search: whole repo

- [ ] **Step 1: Find orphaned i18n keys**

Run:

```bash
grep -n "wildcard\|merge_reveal\|noise_dropped\|noise_system_override\|noise_card_label\|noise_wildcard\|merged_seed\|merged_signals\|noise_selected_label\|noise_choice_locked" i18n/index.tsx
```

For each match, verify the key is truly unused: `grep -rn "<the-key>" app/ components/ hooks/ lib/` must return zero hits. Delete only keys with zero references.

- [ ] **Step 2: Ensure new keys exist**

Verify these keys are defined in `i18n/index.tsx` for every supported language (en, zh, ja, ko if present):
- `bullet_reload`
- `bullet_fire`
- `ammo_loaded_label`
- `curate_stage_hint`

If any are missing, add them now.

- [ ] **Step 3: Repo-wide grep for remaining wildcard / legacy refs**

```bash
grep -rn "wildcard\|MergedNoisePlan\|MergeRevealStage\|buildMergedNoisePlan\|buildMergedNoiseSeed\|mergeSource\|NoiseSeedPanel\|kept_signals_title\|merged_seed_title\|Revolver\b" app/ components/ hooks/ lib/ i18n/ types/
```

Expected: zero hits. (The `\bRevolver\b` check catches any lingering imports of the old `Revolver` component that was replaced by `AmmoHUD`.)

- [ ] **Step 4: Run typecheck, tests, lint**

```bash
npx tsc --noEmit
npm test
npm run lint
```

All must pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned wildcard i18n keys and references"
```

---

### Task 10: Update docs

**Files:**
- Modify: `README.md` (Generation Pipeline section)
- Modify: `CLAUDE.md` (Implementation Notes > Generation Pipeline Parsing)
- Create: `doc/architecture/revolver-curate.md`
- Create: `doc/worklog/2026-04-17.md`

- [ ] **Step 1: Update `README.md` Generation Pipeline description**

Replace the current step-2 description with:

```md
2. **Curate (Load the Revolver)** — Fragments fly across the screen as bold typographic bullets. Catch up to 6 into a top-left ammo HUD; chamber order = seed order. Uncaught bullets ricochet back up to 3 times, fading each pass, then disappear. RELOAD rescans; FIRE plays a cinematic impact beat and hands off to denoising.
```

Remove any mention of "wildcard".

- [ ] **Step 2: Update `CLAUDE.md`**

In the "Generation Pipeline Parsing" section, replace wildcard-related bullets with:

```md
- Step 2 (Curate) is the bullet-catching mechanic — `lib/revolver.ts` owns all pure state transitions (`catchBullet`, `ricochetBullet`, `buildBulletSeed`).
- Chamber order (0..5) dictates the `1::…6::` order in the seed passed to denoising.
- All motion tuning lives in `lib/motion.ts` (durations, easings, type scale, shake amplitude, etc.). Edit there to re-feel the whole phase.
```

- [ ] **Step 3: Create architecture doc**

Create `doc/architecture/revolver-curate.md`:

```md
# Curate Phase — Bullet-Catching (Danganronpa-Style)

## State machine

`RunPhase` gains no new values; `reviewing` covers "bullets flying, some may be caught". Transition to `ready` happens when 6 bullets are caught. FIRE plays the `FireImpact` overlay, then calls `generate()` on impact-complete.

## Data model

- `Bullet` (`types/index.ts`): `id`, `text`, `status` (`flying | ricocheting | caught | spent`), `passCount` (0..3), `chamberIndex` (0..5 if caught).
- `REVOLVER_CHAMBERS = 6`, `MAX_BULLET_PASSES = 3`.

## Pure helpers (`lib/revolver.ts`)

- `fragmentToBullet(fragment) → Bullet`
- `catchBullet(bullets, id) → Bullet[]` — no-op if 6 already caught or bullet not flying/ricocheting.
- `ricochetBullet(bullet) → Bullet` — increments passCount; marks `spent` at 3rd pass.
- `chamberSnapshot(bullets) → (Bullet | null)[6]` — sorted by chamberIndex, nulls for empty slots.
- `buildBulletSeed(bullets) → string` — serializes caught bullets in chamber order as `1::text\n2::text...`. Replaces the removed `buildMergedNoiseSeed`.

## Motion tokens (`lib/motion.ts`)

Single file of tuning knobs: bullet durations, catch spring, ricochet opacity curve, FIRE impact timing, shake amplitude, kinetic type scale. Tune here, see everywhere.

## Components

- **`BulletField`** — Framer Motion `motion.button` per active bullet. Bullets are bold display-serif typographic objects with stable per-id tilt, size, and vertical lane (deterministic hash). Click = catch. `onAnimationComplete` = page calls `ricochetSingle(id)`.
- **`AmmoHUD`** — absolutely positioned top-left. Bracketed counter (`[ LOADED · N / 6 ]`), six `CartridgeIcon` SVG slots, each does a scale-pulse on fill. Slightly tilted with an offset drop shadow (Danganronpa grammar).
- **`CartridgeIcon`** — inline SVG side-profile cartridge. Two states (loaded / empty) controlled by a `loaded` prop.
- **`FireImpact`** — full-screen overlay (`z-index 9999`). Three-stage choreography: ivory flash (80ms) → radial ink speed lines + screen-fill "FIRE" display-serif typography with shake and offset shadow (~520ms) → exit. Calls `onComplete` after `fireTotalMs`.

## Design contract

- **Palette:** warm ivory / moss / plum / ink — same as the rest of the app. Do not drift to pink/black.
- **Typography grammar:** chunky display serif with slight tilt and offset text-shadow. This is the visual DNA that makes the phase feel kinetic without breaking tone with the editorial questionnaire/narrative screens.
- **Diagonal tilt everywhere:** HUD ~-1.2°, impact text -6°, bullets ±5° per id. Nothing is perfectly axis-aligned.
- **No pink.** No anime portraits. No pop-art halftone. The *grammar* is Danganronpa; the *skin* stays editorial.

## Why no wildcard

Ricochet subsumes wildcard's original purpose — inject unchosen fragments. Now "unchosen" either returns (ricochet) or disappears (spent), driven entirely by user reach. No hidden system injection.
```

- [ ] **Step 4: Create worklog**

Create `doc/worklog/2026-04-17.md`:

```md
# 2026-04-17

## Curate phase redesign — bullet-catching with Danganronpa grammar

Replaced the "Keep / Remove" card-at-a-time curate phase with a kinetic bullet-field + top-left ammo HUD. FIRE plays a full-screen impact beat before handing off to denoising. Wildcard mechanic removed entirely; ricochet (3 fading passes) plays its role.

### Design direction (locked)
- Palette: warm ivory / moss / plum / ink (unchanged from rest of app).
- HUD over literal revolver: top-left bracketed `[ LOADED · N / 6 ]` with six cartridge icons; not a cylinder diagram.
- FIRE is the cinematic peak — ~840ms, three stages (flash → speed-line burst + screen-fill typography with shake → exit).
- Typography: chunky display serif, slight per-id tilt, plum offset text-shadow.

### Key deletions
- `buildMergedNoisePlan`, `buildMergedNoiseSeed`, `shuffleFragments` from `lib/prompts.ts`
- `MergedNoisePlan`, `MergeRevealStage`, `mergeSource` from `types/index.ts`
- `NoiseSeedPanel` component
- Wildcard-related i18n keys
- Earlier plan draft used a literal `Revolver` SVG cylinder — replaced with `AmmoHUD` after the Danganronpa direction was chosen.

### Key additions
- `lib/revolver.ts` — pure helpers (tested)
- `lib/motion.ts` — single-file motion/typography token set
- `components/BulletField.tsx` — Framer Motion bullets, deterministic per-id placement
- `components/AmmoHUD.tsx` + `components/CartridgeIcon.tsx`
- `components/FireImpact.tsx` — cinematic FIRE overlay
- Framer Motion as a new runtime dep
- `vitest` + RTL test infra (first tests in the repo)

### Open questions / v2 deferrals
- **Bullet speed = guidance scale signal.** Higher guidance could make bullets fly faster (riskier to catch). Not shipped in v1.
- **Spawn pacing.** v1 uses 0.35s stagger — all scanned bullets animate roughly together. If it feels chaotic, try sequential spawn (1-2 in flight at a time).
- **Mobile tap targets.** Flying typographic bullets may be hard to tap on phones. Watch for this; consider a slow-motion mode on touch if needed.
- **FIRE sound effect.** None in v1. A short sfx on FIRE would double the impact; defer to v2.
```

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md doc/
git commit -m "docs: document revolver curate phase"
```

---

## Self-Review Checklist (run before handoff)

- [ ] Spec covered: fragments fly as typographic bullets (`BulletField`, Task 6), catch into HUD (Task 2 `catchBullet` + Task 5 `AmmoHUD` + Task 8 wiring), chamber order = seed order (`buildBulletSeed` + test in Task 2), uncaught ricochet 3 times then vanish (`ricochetBullet` + test in Task 2), reload = rescan (`reloadScan` in Task 4), no wildcard (deleted in Tasks 1/3/7/9), cinematic FIRE (`FireImpact`, Task 7b), Danganronpa-grammar constants centralized (`lib/motion.ts`, Task 4b).
- [ ] No placeholders: every step has concrete code or concrete commands.
- [ ] Type consistency: `Bullet`, `REVOLVER_CHAMBERS`, `MAX_BULLET_PASSES` defined in Task 1 and used consistently in 2, 4, 5, 6, 8.
- [ ] Function names consistent: `catchBullet` (helper in revolver.ts) is imported inside the hook and re-exported as an action of the same name via a local alias (`catchBulletAction`) to avoid shadowing — see Task 4 Step 5.
- [ ] `chamberSnapshot` and `buildBulletSeed` both sort by chamberIndex — verified in Task 2 tests.
- [ ] Motion tokens referenced by `AmmoHUD`, `BulletField`, `FireImpact` all come from `lib/motion.ts` (Task 4b). No hardcoded durations/easings in the components.
- [ ] Palette stays warm ivory/moss/plum/ink throughout. No pink/black additions.
- [ ] Every phase ends with a commit.

---

## Open Questions (for reviewer, not blocking)

1. **Bullet speed as guidance-scale signal** — should higher guidance scale make bullets fly faster (= feel riskier to catch)? Deferred to v2.
2. **Stagger vs. rare spawn** — should bullets appear one at a time (sequential) or in bursts? Currently: all 10 scanned bullets animate with 0.3s stagger. Ship this, see how it feels, tune.
3. **Mobile tap targets** — flying bullets are hard to tap on phones. If user testing flags this, add a "pause" tap zone or slow-down mode.
