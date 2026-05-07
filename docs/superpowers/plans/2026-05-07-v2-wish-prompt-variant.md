# v2-wish Prompt Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third prompt variant `v2-wish` that asks a different power-fantasy questionnaire, suggests 3-5 canonical Genshin characters, lets the user pick one, and runs a 转生成为X然后天下无敌 transmigration story — without breaking v1 or v2-tight.

**Architecture:** Generalize the prompt-variant registry so each variant declares its own questionnaire schema and reveal contract (`single` vs `candidates`). Existing variants (v1, v2-tight) keep using a shared "editorial" questionnaire with `single`-reveal contract. The new v2-wish variant uses a "wish" questionnaire with `candidates`-reveal contract; its flow inserts a `candidate-pick` phase between `candidates-generating` and `scene-generating`. Storage gains optional `variantId` and `awakeningHook` fields. Bookshelf gains family filter chips (Editorial / Wish-fulfillment / All).

**Tech Stack:** Next.js 15, React 18, TypeScript, Vitest + React Testing Library, vanilla `fetch` for image generation.

**Spec:** [docs/superpowers/specs/2026-05-07-v2-wish-prompt-variant-design.md](../specs/2026-05-07-v2-wish-prompt-variant-design.md)

---

## File Structure

This plan creates and modifies these files. Each task lists exact paths.

```
NEW
  lib/teyvat/canonRoster.ts                       — ~25 CanonCharacter entries
  lib/teyvat/questionnaires/editorialQuestionnaire.ts — moves the existing schema here
  lib/teyvat/questionnaires/wishQuestionnaire.ts  — new wish-fulfillment schema
  lib/teyvat/promptVariants/v1.ts                 — extracted from current promptVariants.ts
  lib/teyvat/promptVariants/v2-tight.ts           — extracted
  lib/teyvat/promptVariants/v2-wish.ts            — new wish-fulfillment variant
  lib/teyvat/candidates.ts                        — pre-filter + candidate prompt + parser
  components/teyvat/CandidateGallery.tsx          — 3-5 candidate card UI
  test/teyvat/canonRoster.test.ts
  test/teyvat/wishQuestionnaire.test.ts
  test/teyvat/candidates.prefilter.test.ts
  test/teyvat/candidates.parse.test.ts
  test/teyvat/promptVariants.capabilities.test.ts
  test/teyvat/promptVariants.v2wish.test.ts
  test/teyvat/storage.variantId.test.ts
  test/teyvat/CandidateGallery.test.tsx

MODIFY
  lib/teyvat/character.ts                         — add optional awakeningHook
  lib/teyvat/scenes.ts                            — add optional variantId
  lib/teyvat/questionnaire.ts                     — re-export from questionnaires/, keep public API
  lib/teyvat/promptVariants.ts                    — slim down to registry + capabilities, re-export
  lib/teyvat/prompts.ts                           — add buildCandidatesPrompt + parseCandidates exports
  lib/teyvat/storage.ts                           — accept and persist variantId / awakeningHook
  components/teyvat/Questionnaire.tsx             — accept schema as prop
  components/teyvat/Bookshelf.tsx                 — variant family filter chips
  hooks/useAdventure.ts                           — candidate-pick phase, pickCandidate, per-variant schema
  app/page.tsx                                    — route candidate-pick phase to CandidateGallery
  i18n/index.tsx                                  — wish questionnaire copy + gallery copy + filter labels
```

## Conventions

- Write the failing test first. Run it to confirm the failure mode matches the assertion. Then implement.
- After each task ends with a passing `npm test`, commit. Commit messages follow the existing style: `feat(teyvat): …`, `test(teyvat): …`, `refactor(teyvat): …`.
- Keep v1/v2-tight behavior identical throughout. The integration tests in `test/teyvat/promptVariants.test.ts`, `prompts.reveal.test.ts`, `prompts.scene.test.ts`, `useAdventure.test.tsx` are the regression guard — never modify them to make new code pass.
- All file paths are absolute from the repo root unless noted.

---

## Task 1: Add `awakeningHook` to RevealedCharacter

**Files:**
- Modify: `lib/teyvat/character.ts`
- Test: `test/teyvat/character.test.ts`

We add an optional field that flows through validation untouched. Editorial reveals leave it undefined; wish-fulfillment reveals set it from the picked candidate hook.

- [ ] **Step 1: Add a failing test for the optional awakeningHook field**

Append to `test/teyvat/character.test.ts`:

```ts
import { validateRevealedCharacter } from "@/lib/teyvat/character";

describe("validateRevealedCharacter — awakeningHook", () => {
  const base = {
    framing: "protagonist",
    name: "Test",
    title: "The Tester",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "polearm",
    archetype: "tester",
    bio: "a bio",
    visionStory: "a story",
    constellation: "starry words",
    signature: "test signature",
    knownAssociate: "",
  };

  it("accepts missing awakeningHook", () => {
    expect(validateRevealedCharacter(base)).toEqual({ ok: true });
  });

  it("accepts string awakeningHook", () => {
    expect(validateRevealedCharacter({ ...base, awakeningHook: "you wake..." })).toEqual({ ok: true });
  });

  it("rejects non-string awakeningHook", () => {
    const result = validateRevealedCharacter({ ...base, awakeningHook: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("awakeningHook must be a string when provided");
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
npm test -- test/teyvat/character.test.ts
```

Expected: the third sub-test fails because the validator doesn't reject non-string `awakeningHook` yet.

- [ ] **Step 3: Implement the validator change**

In `lib/teyvat/character.ts`, add `awakeningHook?: string` to the interface and add a validation branch.

```ts
export interface RevealedCharacter {
  framing: Framing;
  name: string;
  title: string;
  vision: Vision;
  nation: Nation;
  weapon: Weapon;
  archetype: string;
  bio: string;
  visionStory: string;
  constellation: string;
  signature: string;
  knownAssociate: string;
  awakeningHook?: string;
}
```

In `validateRevealedCharacter`, after the `knownAssociate` check, add:

```ts
  if (candidate.awakeningHook !== undefined && typeof candidate.awakeningHook !== "string") {
    errors.push("awakeningHook must be a string when provided");
  }
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- test/teyvat/character.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/character.ts test/teyvat/character.test.ts
git commit -m "feat(teyvat): add optional awakeningHook to RevealedCharacter"
```

---

## Task 2: Add `variantId` to AdventureState + storage round-trip

**Files:**
- Modify: `lib/teyvat/scenes.ts`
- Modify: `lib/teyvat/storage.ts`
- Test: `test/teyvat/storage.variantId.test.ts` (new)

Storage becomes variant-aware so the Bookshelf can group runs by family later.

- [ ] **Step 1: Write failing tests for variantId persistence**

Create `test/teyvat/storage.variantId.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  archiveToLibrary,
  loadAdventure,
  loadLibrary,
  saveAdventure,
} from "@/lib/teyvat/storage";
import type { AdventureState } from "@/lib/teyvat/scenes";

const baseCharacter = {
  framing: "protagonist" as const,
  name: "Test",
  title: "The Tester",
  vision: "Electro" as const,
  nation: "Inazuma" as const,
  weapon: "polearm" as const,
  archetype: "tester",
  bio: "a bio",
  visionStory: "a story",
  constellation: "starry words",
  signature: "test signature",
  knownAssociate: "",
};

function makeAdventure(overrides: Partial<AdventureState> = {}): AdventureState {
  return {
    id: "test-1",
    character: baseCharacter,
    scenes: [],
    ended: false,
    endedBy: null,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("storage — variantId round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("persists variantId on the active adventure", () => {
    const state = makeAdventure({ variantId: "v2-wish" });
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.variantId).toBe("v2-wish");
  });

  it("treats missing variantId as undefined (legacy runs)", () => {
    const state = makeAdventure();
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.variantId).toBeUndefined();
  });

  it("persists variantId across archiveToLibrary", () => {
    const state = makeAdventure({ id: "lib-1", variantId: "v1", ended: true });
    archiveToLibrary(state);
    const lib = loadLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].variantId).toBe("v1");
  });

  it("persists awakeningHook through storage", () => {
    const state = makeAdventure({
      character: { ...baseCharacter, awakeningHook: "you wake..." },
    });
    saveAdventure(state);
    const loaded = loadAdventure();
    expect(loaded?.character.awakeningHook).toBe("you wake...");
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- test/teyvat/storage.variantId.test.ts
```

Expected: FAIL — the type doesn't have `variantId` yet, so the test won't compile or assertions fail.

- [ ] **Step 3: Add `variantId` to AdventureState**

In `lib/teyvat/scenes.ts`:

```ts
import type { RevealedCharacter } from "@/lib/teyvat/character";

export interface Scene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  fromChoice: string;
}

export interface AdventureState {
  id: string;
  character: RevealedCharacter;
  scenes: Scene[];
  ended: boolean;
  endedBy: "model" | "user" | null;
  startedAt: string;
  variantId?: string;
}

export function nextSceneNumber(state: AdventureState): number {
  return state.scenes.length + 1;
}
```

- [ ] **Step 4: Update storage to accept the optional variantId**

`lib/teyvat/storage.ts` already serializes the entire object via `JSON.stringify`, so persistence works without code changes. The validator `hasValidAdventureShape` does NOT need to be changed (it doesn't reject extra fields), but verify by running the tests.

- [ ] **Step 5: Run the tests**

```bash
npm test -- test/teyvat/storage.variantId.test.ts test/teyvat/storage.test.ts
```

Expected: PASS for both files (the existing storage tests must continue to pass).

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/scenes.ts test/teyvat/storage.variantId.test.ts
git commit -m "feat(teyvat): persist optional variantId on AdventureState"
```

---

## Task 3: Define `QuestionnaireSchema` shape and move editorial schema into a folder

**Files:**
- Create: `lib/teyvat/questionnaires/editorialQuestionnaire.ts`
- Modify: `lib/teyvat/questionnaire.ts` (becomes a re-export shim)
- Test: `test/teyvat/questionnaire.test.ts` (existing — must keep passing)

The current `questionnaire.ts` defines `TEYVAT_STEPS` directly. We extract the schema into a typed object that can have siblings.

- [ ] **Step 1: Run the existing questionnaire tests so we know the baseline passes**

```bash
npm test -- test/teyvat/questionnaire.test.ts
```

Expected: PASS.

- [ ] **Step 2: Create the editorial schema file**

Create `lib/teyvat/questionnaires/editorialQuestionnaire.ts`:

```ts
import type {
  ChapterKey,
  LocalizedText,
  QuestionnaireSchema,
  TeyvatOption,
  TeyvatStep,
} from "@/lib/teyvat/questionnaire";

const CHAPTER_META: Record<ChapterKey, { title: LocalizedText; subtitle: LocalizedText }> = {
  mood: {
    title: { en: "Mood", zh: "心境" },
    subtitle: {
      en: "The air around you speaks before the world does.",
      zh: "世界尚未开口之前，周围的气息已经先说了话。",
    },
  },
  desire: {
    title: { en: "Desire", zh: "欲望" },
    subtitle: {
      en: "Want reveals its shape through what it would risk.",
      zh: "欲望真正的形状，藏在它愿意付出的代价里。",
    },
  },
  conflict: {
    title: { en: "Conflict", zh: "冲突" },
    subtitle: {
      en: "The road narrows where choice begins to cost you.",
      zh: "当选择开始要你付出代价，路也就变窄了。",
    },
  },
  // The wish chapters are unused here but stay declared so the union is total.
  origin: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  power: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  desireWish: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
};

function opt(id: string, value: string, en: string, zh: string): TeyvatOption {
  return { id, value, label: { en, zh } };
}

const STEPS: TeyvatStep[] = [
  // ... copy the seven editorial steps verbatim from the current TEYVAT_STEPS
];

export const editorialQuestionnaire: QuestionnaireSchema = {
  id: "editorial",
  chapters: ["mood", "desire", "conflict"],
  chapterMeta: CHAPTER_META,
  steps: STEPS,
};
```

NOTE: copy the seven steps verbatim from the current `TEYVAT_STEPS` definition in `lib/teyvat/questionnaire.ts` (lines 55-161 of the file). Do not modify the wording.

- [ ] **Step 3: Rewrite `lib/teyvat/questionnaire.ts` as a typed contract + re-export shim**

Replace the entire file contents with:

```ts
export interface LocalizedText {
  en: string;
  zh: string;
}

export type ChapterKey = "mood" | "desire" | "conflict" | "origin" | "power" | "desireWish";

export interface TeyvatOption {
  id: string;
  value: string;
  label: LocalizedText;
}

export interface TeyvatStep {
  id: string;
  chapter: ChapterKey;
  title: LocalizedText;
  mode: "single";
  options: TeyvatOption[];
}

export type TeyvatAnswers = Record<string, string>;

export interface QuestionnaireSchema {
  id: string;
  chapters: ChapterKey[];
  chapterMeta: Record<ChapterKey, { title: LocalizedText; subtitle: LocalizedText }>;
  steps: TeyvatStep[];
}

export { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

// Backwards-compat re-exports — existing code (prompts.ts, promptVariants.ts,
// Questionnaire.tsx) continues to import these names. Now they delegate to the
// editorial schema.
export const TEYVAT_STEPS = editorialQuestionnaire.steps;
export const CHAPTER_META = editorialQuestionnaire.chapterMeta;

export function isComplete(answers: TeyvatAnswers, schema: QuestionnaireSchema = editorialQuestionnaire): boolean {
  return schema.steps.every((step) => Boolean(answers[step.id]));
}
```

- [ ] **Step 4: Run the existing tests; nothing else should be touched**

```bash
npm test -- test/teyvat/questionnaire.test.ts test/teyvat/promptVariants.test.ts test/teyvat/prompts.reveal.test.ts test/teyvat/prompts.scene.test.ts
```

Expected: PASS for all four. If any fail, fix the import — do not change test files.

- [ ] **Step 5: Run the full suite to confirm no incidental regressions**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/questionnaire.ts lib/teyvat/questionnaires/editorialQuestionnaire.ts
git commit -m "refactor(teyvat): extract editorial questionnaire schema, add QuestionnaireSchema type"
```

---

## Task 4: Define the wish questionnaire schema

**Files:**
- Create: `lib/teyvat/questionnaires/wishQuestionnaire.ts`
- Test: `test/teyvat/wishQuestionnaire.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/teyvat/wishQuestionnaire.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";

describe("wishQuestionnaire", () => {
  it("has id 'wish'", () => {
    expect(wishQuestionnaire.id).toBe("wish");
  });

  it("declares three chapters in order: origin, power, desireWish", () => {
    expect(wishQuestionnaire.chapters).toEqual(["origin", "power", "desireWish"]);
  });

  it("contains exactly seven steps", () => {
    expect(wishQuestionnaire.steps).toHaveLength(7);
  });

  it("all step ids are unique", () => {
    const ids = wishQuestionnaire.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every step is single-select with 4 options", () => {
    for (const step of wishQuestionnaire.steps) {
      expect(step.mode).toBe("single");
      expect(step.options.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("every option has both en and zh labels", () => {
    for (const step of wishQuestionnaire.steps) {
      for (const o of step.options) {
        expect(o.label.en.trim()).not.toBe("");
        expect(o.label.zh.trim()).not.toBe("");
      }
    }
  });

  it("includes the seven affinity options for q7", () => {
    const affinity = wishQuestionnaire.steps.find((s) => s.id === "affinity");
    expect(affinity).toBeDefined();
    expect(affinity!.options).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- test/teyvat/wishQuestionnaire.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the wish questionnaire**

Create `lib/teyvat/questionnaires/wishQuestionnaire.ts`:

```ts
import type {
  ChapterKey,
  LocalizedText,
  QuestionnaireSchema,
  TeyvatOption,
  TeyvatStep,
} from "@/lib/teyvat/questionnaire";

const CHAPTER_META: Record<ChapterKey, { title: LocalizedText; subtitle: LocalizedText }> = {
  origin: {
    title: { en: "Origin", zh: "出身" },
    subtitle: {
      en: "What you bring with you from the world that will be left behind.",
      zh: "你将带着哪些东西，离开那个即将被抛在身后的世界。",
    },
  },
  power: {
    title: { en: "Power", zh: "力量" },
    subtitle: {
      en: "The shape that overwhelming takes when it finally belongs to you.",
      zh: "当压倒性的力量真正归你所有，它会是怎样的形状。",
    },
  },
  desireWish: {
    title: { en: "Desire", zh: "渴望" },
    subtitle: {
      en: "What victory would have to look like for you to finally rest.",
      zh: "胜利要长成什么样子，才能让你真正放下。",
    },
  },
  // Editorial chapters are unused here but stay declared so the union is total.
  mood: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  desire: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  conflict: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
};

function opt(id: string, value: string, en: string, zh: string): TeyvatOption {
  return { id, value, label: { en, zh } };
}

const STEPS: TeyvatStep[] = [
  {
    id: "escape",
    chapter: "origin",
    title: {
      en: "What pulled you toward another world?",
      zh: "是什么把你从原来的世界拉走？",
    },
    mode: "single",
    options: [
      opt("escape-1", "burnout", "the exhaustion that never left", "怎么也散不去的疲惫"),
      opt("escape-2", "heartbreak", "a wound that wouldn't close", "一道始终没合上的伤口"),
      opt("escape-3", "boredom", "days that all looked the same", "每一天都长得一样"),
      opt("escape-4", "injustice", "a world that wouldn't make it right", "一个不肯还你公道的世界"),
    ],
  },
  {
    id: "denied",
    chapter: "origin",
    title: {
      en: "What did the old world refuse you?",
      zh: "原来的世界拒绝给你什么？",
    },
    mode: "single",
    options: [
      opt("denied-1", "respect", "respect you had earned but never received", "你挣来过却从没得到的尊重"),
      opt("denied-2", "power", "any real power to change anything", "任何足以改变一切的真正力量"),
      opt("denied-3", "love", "love you could trust", "可以信赖的爱"),
      opt("denied-4", "freedom", "freedom from someone else's plan for you", "脱离别人为你安排好的轨道的自由"),
    ],
  },
  {
    id: "dominance",
    chapter: "power",
    title: {
      en: "What kind of overwhelming feels best?",
      zh: "怎样的压倒性最让你称心？",
    },
    mode: "single",
    options: [
      opt("dominance-1", "martial", "martial — no one stands in front of you", "武：没有人能挡在你面前"),
      opt("dominance-2", "political", "political — you decide who rises and who falls", "权：你决定谁起谁落"),
      opt("dominance-3", "intellectual", "intellectual — you see the whole board", "智：整盘棋你尽收眼底"),
      opt("dominance-4", "divine", "divine — the rules of the world bend around you", "神：世界的规则因你而弯"),
    ],
  },
  {
    id: "pace",
    chapter: "power",
    title: {
      en: "How fast should the rise be?",
      zh: "崛起应该有多快？",
    },
    mode: "single",
    options: [
      opt("pace-1", "instant", "you wake already at the top", "你醒来时就站在顶端"),
      opt("pace-2", "earned", "earned through escalating wins", "在一场场胜利中逐步登顶"),
      opt("pace-3", "patient", "patient — every move part of a longer plan", "沉得住气：每一步都是更长远计划的一部分"),
      opt("pace-4", "explosive", "explosive — slow build, then a single decisive break", "蓄势良久，最后一击雷霆万钧"),
    ],
  },
  {
    id: "humble",
    chapter: "desireWish",
    title: {
      en: "Who most deserves to be humbled?",
      zh: "谁最该被你折服？",
    },
    mode: "single",
    options: [
      opt("humble-1", "scorners", "those who scorned you when you were nothing", "那些在你一无所有时轻视你的人"),
      opt("humble-2", "rival-faction", "a rival faction that thought it ruled", "自以为掌权的对立势力"),
      opt("humble-3", "heavens", "the heavens themselves", "苍天本身"),
      opt("humble-4", "live-well", "no one — you'd rather just live well", "都不必：你只想好好过日子"),
    ],
  },
  {
    id: "reward",
    chapter: "desireWish",
    title: {
      en: "What reward is worth fighting for?",
      zh: "什么样的回报值得你去争？",
    },
    mode: "single",
    options: [
      opt("reward-1", "recognition", "recognition that lasts past your death", "你死之后仍能延续的声名"),
      opt("reward-2", "companions", "companions and bonds that hold", "靠得住的同伴与羁绊"),
      opt("reward-3", "wealth", "wealth and territory", "财富与疆土"),
      opt("reward-4", "transcendence", "transcendence — to step beyond the rules entirely", "超脱：彻底跳出规则之外"),
    ],
  },
  {
    id: "affinity",
    chapter: "desireWish",
    title: {
      en: "What aesthetic calls to you?",
      zh: "哪一种气质最召唤你？",
    },
    mode: "single",
    options: [
      opt("affinity-electro", "electro", "thunder and steel", "雷与刃"),
      opt("affinity-geo", "geo", "stone and gold", "石与金"),
      opt("affinity-pyro", "pyro", "flame and fragrance", "火与香"),
      opt("affinity-cryo", "cryo", "frost and silence", "霜与寂"),
      opt("affinity-anemo", "anemo", "wind and song", "风与歌"),
      opt("affinity-hydro", "hydro", "water and starlight", "水与星光"),
      opt("affinity-dendro", "dendro", "dendro and verse", "草木与诗"),
    ],
  },
];

export const wishQuestionnaire: QuestionnaireSchema = {
  id: "wish",
  chapters: ["origin", "power", "desireWish"],
  chapterMeta: CHAPTER_META,
  steps: STEPS,
};
```

- [ ] **Step 4: Run the test**

```bash
npm test -- test/teyvat/wishQuestionnaire.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/questionnaires/wishQuestionnaire.ts test/teyvat/wishQuestionnaire.test.ts
git commit -m "feat(teyvat): add wish-fulfillment questionnaire schema"
```

---

## Task 5: Define the canon roster

**Files:**
- Create: `lib/teyvat/canonRoster.ts`
- Test: `test/teyvat/canonRoster.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/teyvat/canonRoster.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- test/teyvat/canonRoster.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the canon roster**

Create `lib/teyvat/canonRoster.ts`. The roster is ~25 hand-picked canonical Genshin characters with full power-fantasy tag coverage. Use this exact content:

```ts
import type { LocalizedText } from "@/lib/teyvat/questionnaire";
import type { Nation, Vision, Weapon } from "@/lib/teyvat/elements";

export type Dominance = "martial" | "political" | "intellectual" | "divine";
export type Pace = "instant" | "earned" | "patient" | "explosive";
export type HumbleTarget = "scorners" | "rival-faction" | "heavens" | "live-well";
export type Reward = "recognition" | "companions" | "wealth" | "transcendence";

export interface CanonCharacter {
  id: string;
  nameEn: string;
  nameZh: string;
  vision: Vision;
  nation: Nation;
  weapon: Weapon;
  archetypeTags: string[];
  archetypeBlurb: LocalizedText;
  bioBlurb: LocalizedText;
  powerFantasyAxes: {
    dominance: Dominance[];
    pace: Pace[];
    humbleTargets: HumbleTarget[];
    rewards: Reward[];
  };
}

export const CANON_ROSTER: CanonCharacter[] = [
  {
    id: "raiden-shogun",
    nameEn: "Raiden Shogun",
    nameZh: "雷电将军",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "polearm",
    archetypeTags: ["divine", "ruler", "isolated", "martial"],
    archetypeBlurb: {
      en: "The Electro Archon. Eternity given a body and a blade.",
      zh: "雷电之神。化作肉身与刀的「永恒」。",
    },
    bioBlurb: {
      en: "Ruler of Inazuma, vessel of Ei, wielder of the Musou no Hitotachi. Her court is silent because she does not need to raise her voice.",
      zh: "稻妻之主，影的容器，无想之一刀的执剑者。她的朝堂沉默，因为她从不需要提高声音。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "martial", "political"],
      pace: ["instant", "patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "zhongli",
    nameEn: "Zhongli",
    nameZh: "钟离",
    vision: "Geo",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["divine", "patient", "scholar", "retired"],
    archetypeBlurb: {
      en: "Morax in retirement. The contract-keeper who shaped a nation.",
      zh: "退位的岩王帝君。一手立下契约、塑造璃月的旧神。",
    },
    bioBlurb: {
      en: "Six millennia of memory wear his mortal coat lightly. He drinks tea, attends funerals, and lets the ground decide.",
      zh: "六千年记忆披在他凡人的外衣下毫不沉重。他饮茶，吊丧，把判决留给大地。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "intellectual", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction", "heavens", "live-well"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "venti",
    nameEn: "Venti",
    nameZh: "温迪",
    vision: "Anemo",
    nation: "Mondstadt",
    weapon: "bow",
    archetypeTags: ["divine", "trickster", "bard", "free"],
    archetypeBlurb: {
      en: "Barbatos in a tavern. Freedom that refuses to wear a crown.",
      zh: "酒馆里的巴巴托斯。不肯戴上王冠的自由。",
    },
    bioBlurb: {
      en: "The Anemo Archon walks Mondstadt as a wandering bard. He sings songs older than the city and forgets which centuries he wrote them in.",
      zh: "风神在蒙德以游吟诗人的身份行走。他唱比城市更古老的歌，忘了自己是在哪个世纪写下的。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "intellectual"],
      pace: ["patient", "explosive"],
      humbleTargets: ["live-well", "heavens"],
      rewards: ["companions", "transcendence"],
    },
  },
  {
    id: "nahida",
    nameEn: "Nahida",
    nameZh: "纳西妲",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "catalyst",
    archetypeTags: ["divine", "scholar", "child", "wisdom"],
    archetypeBlurb: {
      en: "The Dendro Archon. Wisdom in a small body, mercy in a large one.",
      zh: "草神。小小身体里的智慧，巨大身体里的怜悯。",
    },
    bioBlurb: {
      en: "Born only five centuries ago and already older in patience than nations. She sees thoughts the way others see weather.",
      zh: "五百年前才诞生，却比许多国度更耐心地古老。她看人的念头，像别人看天气一样。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "divine"],
      pace: ["earned", "patient"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "yae-miko",
    nameEn: "Yae Miko",
    nameZh: "八重神子",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "catalyst",
    archetypeTags: ["scheming", "ageless", "priestess", "patient"],
    archetypeBlurb: {
      en: "The Guuji of the Grand Narukami Shrine. A fox who finds amusement in centuries.",
      zh: "鸣神大社的宫司大人。一只在世纪中自寻乐趣的狐狸。",
    },
    bioBlurb: {
      en: "She runs a publishing house, advises a Shogun, and laughs at most things. The smile is part of the strategy.",
      zh: "她经营着出版社，辅佐着将军，对大多数事物报以笑意。笑意本身也是计谋的一部分。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "political", "divine"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "hu-tao",
    nameEn: "Hu Tao",
    nameZh: "胡桃",
    vision: "Pyro",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["mortal", "trickster", "spirited", "balanced"],
    archetypeBlurb: {
      en: "77th Director of Wangsheng Funeral Parlor. The line between life and death runs through her ledgers.",
      zh: "往生堂第七十七代堂主。生死之间那条线，正穿过她的账本。",
    },
    bioBlurb: {
      en: "She walks both yang and yin with equal levity. The dead are her clients; the living are her targets for jokes.",
      zh: "她以同样的轻盈走过阴阳两端。亡者是她的主顾，生者是她调侃的目标。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners", "live-well"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "kamisato-ayaka",
    nameEn: "Kamisato Ayaka",
    nameZh: "神里绫华",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "sword",
    archetypeTags: ["noble", "disciplined", "graceful", "earned"],
    archetypeBlurb: {
      en: "Shirasagi Himegimi of the Kamisato clan. Discipline as a kind of beauty.",
      zh: "神里家的白鹭氷华。把克己练成了一种美。",
    },
    bioBlurb: {
      en: "She bears the weight of a noble house with practiced ease. Behind every gracious bow is a winter blade.",
      zh: "她以娴熟的轻盈承担着名门的重量。每一记温雅的礼后都藏着一柄寒冬之刃。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "patient"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "tartaglia",
    nameEn: "Tartaglia",
    nameZh: "达达利亚",
    vision: "Hydro",
    nation: "Snezhnaya",
    weapon: "bow",
    archetypeTags: ["martial", "warrior", "explosive", "outsider"],
    archetypeBlurb: {
      en: "Eleventh of the Fatui Harbingers. The fight is the point.",
      zh: "「公子」，愚人众第十一席。打架本身就是目的。",
    },
    bioBlurb: {
      en: "Childe walked into the Abyss as a boy and walked back out hungry. He keeps moving because standing still hurts more.",
      zh: "他在少年时走入深渊，再走出时已不知餍足。他不停下，因为停下更难捱。",
    },
    powerFantasyAxes: {
      dominance: ["martial"],
      pace: ["instant", "explosive"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "ganyu",
    nameEn: "Ganyu",
    nameZh: "甘雨",
    vision: "Cryo",
    nation: "Liyue",
    weapon: "bow",
    archetypeTags: ["loyal", "patient", "half-adeptus", "scholar"],
    archetypeBlurb: {
      en: "Secretary of the Liyue Qixing. Three thousand years of meeting minutes.",
      zh: "璃月七星的秘书。三千年的会议记录。",
    },
    bioBlurb: {
      en: "She inherited the patience of qilin and the workload of a city. Both fit her better than they should.",
      zh: "她继承了麒麟的耐心，也接下了一座城邦的工作。两者都比理应的更合身。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["patient", "earned"],
      humbleTargets: ["live-well", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "diluc",
    nameEn: "Diluc",
    nameZh: "迪卢克",
    vision: "Pyro",
    nation: "Mondstadt",
    weapon: "claymore",
    archetypeTags: ["wealth", "vigilante", "earned", "isolated"],
    archetypeBlurb: {
      en: "Tycoon of Dawn Winery. Mondstadt's unsigned protector.",
      zh: "晨曦酒庄的庄主。蒙德没有署名的守护者。",
    },
    bioBlurb: {
      en: "He owns more vineyards than any noble and walks more rooftops than any knight. Both shifts are unpaid.",
      zh: "他拥有的葡萄园比任何贵族都多，踏过的屋脊比任何骑士都广。两份工作都没有薪水。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "explosive"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["wealth", "recognition"],
    },
  },
  {
    id: "albedo",
    nameEn: "Albedo",
    nameZh: "阿贝多",
    vision: "Geo",
    nation: "Mondstadt",
    weapon: "sword",
    archetypeTags: ["scholar", "alchemist", "patient", "outsider"],
    archetypeBlurb: {
      en: "Chief Alchemist of the Knights of Favonius. The Kreideprinz with quiet eyes.",
      zh: "西风骑士团首席炼金术士。眼神安静的「白垩之子」。",
    },
    bioBlurb: {
      en: "He treats people like experiments worth respecting. He sketches what he loves and erases what he doesn't.",
      zh: "他把人当作值得尊重的实验对象。他写生所爱，擦掉余者。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "xiao",
    nameEn: "Xiao",
    nameZh: "魈",
    vision: "Anemo",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["adeptus", "haunted", "martial", "isolated"],
    archetypeBlurb: {
      en: "Yaksha of the Liyue adepti. Karmic debt walking on a polearm's edge.",
      zh: "璃月仙众中的夜叉。一柄长枪刃上行走的业债。",
    },
    bioBlurb: {
      en: "He has hunted demons for two millennia and is part of the bill himself. Solitude is mercy he gives others.",
      zh: "他斩了两千年妖魔，自己也写在那份账上。独处是他对旁人的仁慈。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "divine"],
      pace: ["instant", "explosive"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "wanderer",
    nameEn: "Wanderer",
    nameZh: "流浪者",
    vision: "Anemo",
    nation: "wandering",
    weapon: "catalyst",
    archetypeTags: ["outsider", "former-divine", "scornful", "intelligent"],
    archetypeBlurb: {
      en: "Former Balladeer, former Harbinger, currently nothing. Memory edited, hatred kept.",
      zh: "曾经的「散兵」，曾经的执行官，如今谁也不是。记忆被改写，恨意还留着。",
    },
    bioBlurb: {
      en: "He has been a puppet, a weapon, a god, and a footnote. He is determined to be the next thing on his own terms.",
      zh: "他曾是傀儡，是武器，是神，也是注脚。下一种身份，他打算自己定。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual", "divine"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners", "heavens"],
      rewards: ["recognition", "transcendence"],
    },
  },
  {
    id: "furina",
    nameEn: "Furina",
    nameZh: "芙宁娜",
    vision: "Hydro",
    nation: "Fontaine",
    weapon: "sword",
    archetypeTags: ["divine", "performer", "lonely", "earned"],
    archetypeBlurb: {
      en: "Once Hydro Archon, now Hydro hostess. Five hundred years of an act that finally ended.",
      zh: "曾经的水神，如今的水都名媛。一场演了五百年、终于落幕的戏。",
    },
    bioBlurb: {
      en: "She held a stage and a covenant alone. The applause was real even when nothing else was.",
      zh: "她独自撑起一座舞台，也撑起一纸盟约。即便其他一切是假，掌声是真的。",
    },
    powerFantasyAxes: {
      dominance: ["political", "divine"],
      pace: ["patient", "earned"],
      humbleTargets: ["scorners", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "neuvillette",
    nameEn: "Neuvillette",
    nameZh: "那维莱特",
    vision: "Hydro",
    nation: "Fontaine",
    weapon: "catalyst",
    archetypeTags: ["judge", "patient", "dragon", "lawful"],
    archetypeBlurb: {
      en: "Iudex of Fontaine. The Hydro Sovereign in a courtroom.",
      zh: "枫丹的最高审判官。法庭中的水龙王。",
    },
    bioBlurb: {
      en: "He weighs guilt the way the sea weighs stones. The law speaks through him because he is older than the law.",
      zh: "他衡量罪责，如同海衡量石。法藉他而言，因他比法更古老。",
    },
    powerFantasyAxes: {
      dominance: ["political", "divine", "intellectual"],
      pace: ["patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["recognition", "transcendence"],
    },
  },
  {
    id: "arlecchino",
    nameEn: "Arlecchino",
    nameZh: "阿蕾奇诺",
    vision: "Pyro",
    nation: "Snezhnaya",
    weapon: "polearm",
    archetypeTags: ["scheming", "ruthless", "matriarch", "earned"],
    archetypeBlurb: {
      en: "Fourth of the Fatui Harbingers. The House of the Hearth raises children and burns rivals.",
      zh: "愚人众第四席。炉之家既养孩子，也烧仇敌。",
    },
    bioBlurb: {
      en: "She runs an orphanage and a knife both with care. The knife is for whoever threatens the orphanage.",
      zh: "孤儿院与利刃她都用心经营。刀，是留给威胁那所孤儿院的人的。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["wealth", "companions"],
    },
  },
  {
    id: "ningguang",
    nameEn: "Ningguang",
    nameZh: "凝光",
    vision: "Geo",
    nation: "Liyue",
    weapon: "catalyst",
    archetypeTags: ["wealth", "political", "self-made", "patient"],
    archetypeBlurb: {
      en: "Tianquan of the Liyue Qixing. The Jade Chamber casts long shadows.",
      zh: "璃月七星之天权。群玉阁投下的影子很长。",
    },
    bioBlurb: {
      en: "She rose from nothing and built a floating palace to remember it by. Information is the currency she trades in best.",
      zh: "她从一无所有起家，建起一座浮空宫殿作纪念。她最擅长的货币，是情报。",
    },
    powerFantasyAxes: {
      dominance: ["political", "intellectual"],
      pace: ["earned", "patient"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["wealth", "recognition"],
    },
  },
  {
    id: "kazuha",
    nameEn: "Kaedehara Kazuha",
    nameZh: "枫原万叶",
    vision: "Anemo",
    nation: "Inazuma",
    weapon: "sword",
    archetypeTags: ["wandering", "poet", "swift", "free"],
    archetypeBlurb: {
      en: "An exiled samurai of the Kaedehara line. The wind keeps his promises for him.",
      zh: "枫原家的流亡武士。风替他守着承诺。",
    },
    bioBlurb: {
      en: "He carries a friend's sword and a friend's grief. He travels light because he refuses to lay either down.",
      zh: "他带着一位友人的刀，也带着同一位友人的悲伤。他行旅至简——这两样都不肯放下。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["earned", "explosive"],
      humbleTargets: ["live-well", "scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "alhaitham",
    nameEn: "Alhaitham",
    nameZh: "艾尔海森",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "sword",
    archetypeTags: ["scholar", "blunt", "intellectual", "patient"],
    archetypeBlurb: {
      en: "Acting Grand Sage of the Akademiya. Reason walks beside him with a sword.",
      zh: "教令院代理大贤者。理性带着一柄剑陪在他身边。",
    },
    bioBlurb: {
      en: "He treats power as a tool to put down once the work is done. Most people don't believe him until he does.",
      zh: "他把权力当作做完事就该放下的工具。多数人直到他真的放下，才相信他说真的。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "political"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "ei",
    nameEn: "Ei",
    nameZh: "影",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "polearm",
    archetypeTags: ["divine", "guarded", "introspective", "warrior"],
    archetypeBlurb: {
      en: "Beelzebul of Baal's pact. The Archon behind the Shogun.",
      zh: "拜尔之契中的雷电真君。将军背后的真神。",
    },
    bioBlurb: {
      en: "She kept herself in a Plane of Euthymia for centuries to keep her promise to her sister. The world had to wait.",
      zh: "她为守对妹妹的承诺，把自己锁在「一心净土」数百年。世界只好等。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "martial"],
      pace: ["instant", "patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "mavuika",
    nameEn: "Mavuika",
    nameZh: "玛薇卡",
    vision: "Pyro",
    nation: "Natlan",
    weapon: "claymore",
    archetypeTags: ["divine", "leader", "fiery", "earned"],
    archetypeBlurb: {
      en: "Pyro Archon of Natlan. War leader who rides the fire in front of her people.",
      zh: "纳塔的火神。战时领袖，带头冲在火前。",
    },
    bioBlurb: {
      en: "She does not stand on a dais. Her authority is the kind people walk into combat behind.",
      zh: "她不立于高台。她的威望是众人愿跟在身后冲锋的那种。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "divine", "political"],
      pace: ["explosive", "instant"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "cyno",
    nameEn: "Cyno",
    nameZh: "赛诺",
    vision: "Electro",
    nation: "Sumeru",
    weapon: "polearm",
    archetypeTags: ["judge", "stern", "ancient-mask", "patient"],
    archetypeBlurb: {
      en: "General Mahamatra of the Akademiya. The mask of the jackal-headed god rests near him.",
      zh: "教令院总大慈树王下的「大风纪官」。胡狼头之神的面具就放在他手边。",
    },
    bioBlurb: {
      en: "He hunts academic crime with the patience of a desert. He tells terrible jokes with the patience of someone who knows they're terrible.",
      zh: "他以沙漠的耐心追查学术之罪。他说着糟糕的笑话，带着「我知道糟，但我说定了」的耐心。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction"],
      rewards: ["recognition"],
    },
  },
  {
    id: "tighnari",
    nameEn: "Tighnari",
    nameZh: "提纳里",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "bow",
    archetypeTags: ["scholar", "ranger", "patient", "ethical"],
    archetypeBlurb: {
      en: "Forest Watcher of Avidya. He prefers the trees to most people, and they prefer him.",
      zh: "觉王的森林管理者。他更喜欢树木胜过多数人，树木也更喜欢他。",
    },
    bioBlurb: {
      en: "He marks every misstep in the forest and remembers each one. The forest pays him back in safety.",
      zh: "他记下林中每一处疏失，且一一记得。森林以安宁回报他。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["patient"],
      humbleTargets: ["live-well", "scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "lyney",
    nameEn: "Lyney",
    nameZh: "林尼",
    vision: "Pyro",
    nation: "Fontaine",
    weapon: "bow",
    archetypeTags: ["performer", "trickster", "earned", "loyal"],
    archetypeBlurb: {
      en: "Magician of the House of the Hearth. Every trick is a kindness misdirected.",
      zh: "炉之家的魔术师。每一个戏法，都是被巧妙引开方向的善意。",
    },
    bioBlurb: {
      en: "He performs in front of crowds and hides his work in the wings. The applause goes to him; the favor goes to his family.",
      zh: "他在台前表演，把功夫留在台后。掌声归他，恩情归他的家人。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "clorinde",
    nameEn: "Clorinde",
    nameZh: "克洛琳德",
    vision: "Electro",
    nation: "Fontaine",
    weapon: "sword",
    archetypeTags: ["duelist", "stoic", "professional", "patient"],
    archetypeBlurb: {
      en: "Champion Duelist of Fontaine's Court of Fontaine. She speaks through the tip of a sword.",
      zh: "枫丹决斗代理人。她用剑尖说话。",
    },
    bioBlurb: {
      en: "She fights other people's duels because no one else will and she's the best at it. The reputation is a side effect.",
      zh: "她替别人打决斗——因为别人不愿，且她最擅长。声名只是副产物。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "explosive"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
];

export function getCanonCharacter(id: string): CanonCharacter | null {
  return CANON_ROSTER.find((c) => c.id === id) ?? null;
}
```

- [ ] **Step 4: Run the test**

```bash
npm test -- test/teyvat/canonRoster.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/canonRoster.ts test/teyvat/canonRoster.test.ts
git commit -m "feat(teyvat): add canonical Genshin character roster for v2-wish"
```

---

## Task 6: Pre-filter helper for the candidate roster

**Files:**
- Create: `lib/teyvat/candidates.ts`
- Test: `test/teyvat/candidates.prefilter.test.ts`

The pre-filter narrows ~25 → ~8-10 by tag overlap. Deterministic given the same answers.

- [ ] **Step 1: Write failing tests**

Create `test/teyvat/candidates.prefilter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prefilterRoster } from "@/lib/teyvat/candidates";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

const allAnswers: TeyvatAnswers = {
  escape: "burnout",
  denied: "respect",
  dominance: "martial",
  pace: "instant",
  humble: "scorners",
  reward: "recognition",
  affinity: "electro",
};

describe("prefilterRoster", () => {
  it("returns at most 10 entries", () => {
    expect(prefilterRoster(CANON_ROSTER, allAnswers).length).toBeLessThanOrEqual(10);
  });

  it("returns at least 6 entries even when answers are sparse", () => {
    expect(prefilterRoster(CANON_ROSTER, {} as TeyvatAnswers).length).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic for the same input", () => {
    const a = prefilterRoster(CANON_ROSTER, allAnswers).map((c) => c.id);
    const b = prefilterRoster(CANON_ROSTER, allAnswers).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it("ranks martial+instant answers above patient ones", () => {
    const martial = prefilterRoster(CANON_ROSTER, {
      ...allAnswers,
      dominance: "martial",
      pace: "instant",
    });
    const ids = martial.map((c) => c.id);
    expect(ids).toContain("tartaglia"); // martial+instant
  });

  it("electro affinity boosts electro-vision characters", () => {
    const electro = prefilterRoster(CANON_ROSTER, { ...allAnswers, affinity: "electro" });
    const top3 = electro.slice(0, 3).map((c) => c.id);
    // Of the top 3, at least one should be Electro
    expect(top3.some((id) => {
      const c = CANON_ROSTER.find((x) => x.id === id);
      return c?.vision === "Electro";
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- test/teyvat/candidates.prefilter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pre-filter**

Create `lib/teyvat/candidates.ts`:

```ts
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";
import type { Vision } from "@/lib/teyvat/elements";

const PREFILTER_MIN = 6;
const PREFILTER_MAX = 10;

const AFFINITY_TO_VISION: Record<string, Vision | undefined> = {
  electro: "Electro",
  geo: "Geo",
  pyro: "Pyro",
  cryo: "Cryo",
  anemo: "Anemo",
  hydro: "Hydro",
  dendro: "Dendro",
};

function score(c: CanonCharacter, answers: TeyvatAnswers): number {
  let s = 0;
  if (answers.dominance && c.powerFantasyAxes.dominance.includes(answers.dominance as never)) s += 3;
  if (answers.pace && c.powerFantasyAxes.pace.includes(answers.pace as never)) s += 2;
  if (answers.humble && c.powerFantasyAxes.humbleTargets.includes(answers.humble as never)) s += 2;
  if (answers.reward && c.powerFantasyAxes.rewards.includes(answers.reward as never)) s += 2;
  const affinityVision = answers.affinity ? AFFINITY_TO_VISION[answers.affinity] : undefined;
  if (affinityVision && c.vision === affinityVision) s += 2;
  return s;
}

/**
 * Narrow the canon roster to the top ~6-10 candidates by tag overlap.
 * Stable: ties broken by roster order. Pads with the highest-archetype-diversity
 * remainder when scoring is sparse.
 */
export function prefilterRoster(
  roster: CanonCharacter[],
  answers: TeyvatAnswers
): CanonCharacter[] {
  const scored = roster.map((c, idx) => ({ c, score: score(c, answers), idx }));
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  const top = scored.slice(0, PREFILTER_MAX);
  if (top.length >= PREFILTER_MIN) {
    return top.map((entry) => entry.c);
  }
  // Pad — should never trigger with a 25-entry roster, but kept as a safety rail.
  return scored.slice(0, PREFILTER_MIN).map((entry) => entry.c);
}
```

- [ ] **Step 4: Run the test**

```bash
npm test -- test/teyvat/candidates.prefilter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/candidates.ts test/teyvat/candidates.prefilter.test.ts
git commit -m "feat(teyvat): pre-filter canon roster by power-fantasy tag overlap"
```

---

## Task 7: Candidate prompt builder + parser

**Files:**
- Modify: `lib/teyvat/candidates.ts` (extend with `buildCandidatesPrompt` and `parseCandidates`)
- Test: `test/teyvat/candidates.parse.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/teyvat/candidates.parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCandidatesPrompt, parseCandidates } from "@/lib/teyvat/candidates";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";

const sampleAnswers = {
  escape: "burnout",
  denied: "respect",
  dominance: "martial",
  pace: "instant",
  humble: "scorners",
  reward: "recognition",
  affinity: "electro",
};

describe("buildCandidatesPrompt", () => {
  it("includes every prefiltered roster entry's id", () => {
    const prefiltered = CANON_ROSTER.slice(0, 8);
    const prompt = buildCandidatesPrompt(sampleAnswers, prefiltered, "en");
    for (const c of prefiltered) {
      expect(prompt).toContain(c.id);
    }
  });

  it("requests output language English when given 'en'", () => {
    const prompt = buildCandidatesPrompt(sampleAnswers, CANON_ROSTER.slice(0, 8), "en");
    expect(prompt).toMatch(/English/i);
  });

  it("requests Chinese output when given 'zh'", () => {
    const prompt = buildCandidatesPrompt(sampleAnswers, CANON_ROSTER.slice(0, 8), "zh");
    expect(prompt).toMatch(/Chinese|中文/i);
  });
});

describe("parseCandidates", () => {
  const allowedIds = new Set(CANON_ROSTER.slice(0, 8).map((c) => c.id));

  it("accepts a valid response with 3-5 candidates", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "you wake..." },
        { id: CANON_ROSTER[1].id, hook: "you wake..." },
        { id: CANON_ROSTER[2].id, hook: "you wake..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseCandidates("not json", allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects fewer than 3 candidates", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 5 candidates", () => {
    const raw = JSON.stringify({
      candidates: CANON_ROSTER.slice(0, 6).map((c) => ({ id: c.id, hook: "..." })),
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects unknown ids", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: "not-real-character", hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("rejects empty hooks", () => {
    const raw = JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "" },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    });
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(false);
  });

  it("strips code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify({
      candidates: [
        { id: CANON_ROSTER[0].id, hook: "..." },
        { id: CANON_ROSTER[1].id, hook: "..." },
        { id: CANON_ROSTER[2].id, hook: "..." },
      ],
    }) + "\n```";
    const result = parseCandidates(raw, allowedIds);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- test/teyvat/candidates.parse.test.ts
```

Expected: FAIL — `buildCandidatesPrompt` and `parseCandidates` don't exist.

- [ ] **Step 3: Implement the prompt builder and parser**

Add `import type { Language } from "@/types";` to the **top** of `lib/teyvat/candidates.ts` alongside the existing imports. Then append the rest below the existing `prefilterRoster` function:

```ts
const LANG_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

function answersBlock(answers: TeyvatAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

function rosterBlock(roster: CanonCharacter[]): string {
  return roster
    .map((c) => `- id: ${c.id} | ${c.nameEn} (${c.nameZh}) — ${c.vision} ${c.weapon} from ${c.nation} | tags: ${c.archetypeTags.join(", ")}`)
    .join("\n");
}

export function buildCandidatesPrompt(
  answers: TeyvatAnswers,
  prefilteredRoster: CanonCharacter[],
  language: Language
): string {
  const outputLanguage = LANG_NAMES[language] ?? LANG_NAMES.en;
  return `You are casting a wish-fulfillment (爽文) transmigration adventure set in Genshin Impact / Teyvat.

The reader gave these answers (treat as emotional signal, do not echo verbatim):
${answersBlock(answers)}

Pick 3 to 5 of the canonical Genshin characters below whose archetypes most resonate with the reader's answers. Prefer diversity across vision/nation when scoring is close.

Available characters (you must use one of these exact ids):
${rosterBlock(prefilteredRoster)}

For each picked character, write a transmigration "awakening hook" — 2 to 3 sentences in ${outputLanguage}, in first person, in 爽文 tone. The hook describes the moment the modern reader wakes up *as* this canonical character with their memories and powers intact. Lean into the power-fantasy: dominance shown not told, the world bending around the protagonist, the inheritance arriving fully formed.

Constraints:
- Use 1-3 hard rules at most. The hook should feel inevitable, not explained.
- Do not narrate canonical bio. The reader knows who this character is.
- Do not mention questionnaires, prompts, or meta process.
- Output raw JSON only. No prose before or after. No code fences.

Schema:
{
  "candidates": [
    { "id": "raiden-shogun", "hook": "..." },
    { "id": "zhongli", "hook": "..." }
  ]
}`;
}

export type CandidatesParseResult =
  | { ok: true; candidates: { id: string; hook: string }[] }
  | { ok: false; errors: string[] };

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseCandidates(
  raw: string,
  allowedIds: Set<string>
): CandidatesParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${(error as Error).message}`] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["parsed JSON is not an object"] };
  }

  const candidatesField = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidatesField)) {
    return { ok: false, errors: ["'candidates' must be an array"] };
  }

  if (candidatesField.length < 3 || candidatesField.length > 5) {
    return {
      ok: false,
      errors: [`'candidates' must contain 3 to 5 entries, got ${candidatesField.length}`],
    };
  }

  const errors: string[] = [];
  const out: { id: string; hook: string }[] = [];
  const seen = new Set<string>();

  for (const entry of candidatesField) {
    if (typeof entry !== "object" || entry === null) {
      errors.push("each candidate must be an object");
      continue;
    }
    const id = (entry as { id?: unknown }).id;
    const hook = (entry as { hook?: unknown }).hook;
    if (typeof id !== "string" || !id) {
      errors.push("each candidate must have a non-empty 'id' string");
      continue;
    }
    if (!allowedIds.has(id)) {
      errors.push(`unknown candidate id '${id}' — must be one from the prefiltered roster`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`duplicate candidate id '${id}'`);
      continue;
    }
    seen.add(id);
    if (typeof hook !== "string" || hook.trim() === "") {
      errors.push(`candidate '${id}' has an empty hook`);
      continue;
    }
    out.push({ id, hook: hook.trim() });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, candidates: out };
}
```

- [ ] **Step 4: Run the test**

```bash
npm test -- test/teyvat/candidates.parse.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/candidates.ts test/teyvat/candidates.parse.test.ts
git commit -m "feat(teyvat): add buildCandidatesPrompt + parseCandidates for v2-wish"
```

---

## Task 8: Add `capabilities` to the prompt-variant registry (existing variants)

**Files:**
- Modify: `lib/teyvat/promptVariants.ts`
- Test: `test/teyvat/promptVariants.capabilities.test.ts` (new)

We extend the existing `PromptVariant` type with a `capabilities` block, and populate it for v1 / v2-tight. We do NOT add v2-wish yet (that's task 10).

- [ ] **Step 1: Write the failing test**

Create `test/teyvat/promptVariants.capabilities.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PROMPT_VARIANTS, getPromptVariant } from "@/lib/teyvat/promptVariants";
import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

describe("PromptVariant capabilities", () => {
  it("every registered variant declares capabilities", () => {
    for (const v of PROMPT_VARIANTS) {
      expect(v.capabilities).toBeDefined();
      expect(v.capabilities.questionnaire).toBeDefined();
      expect(v.capabilities.reveal).toBeDefined();
    }
  });

  it("v1 uses the editorial questionnaire and single-reveal contract", () => {
    const v1 = getPromptVariant("v1");
    expect(v1.capabilities.questionnaire).toBe(editorialQuestionnaire);
    expect(v1.capabilities.reveal.kind).toBe("single");
  });

  it("v2-tight uses the editorial questionnaire and single-reveal contract", () => {
    const v = getPromptVariant("v2-tight");
    expect(v.capabilities.questionnaire).toBe(editorialQuestionnaire);
    expect(v.capabilities.reveal.kind).toBe("single");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- test/teyvat/promptVariants.capabilities.test.ts
```

Expected: FAIL — `capabilities` not declared.

- [ ] **Step 3: Update `promptVariants.ts`**

Modify `lib/teyvat/promptVariants.ts`. Add the new types near the top (above `PromptVariantMeta`):

```ts
import type { QuestionnaireSchema } from "@/lib/teyvat/questionnaire";
import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

export type RevealContract =
  | { kind: "single" }
  | { kind: "candidates"; min: number; max: number };

export interface PromptVariantCapabilities {
  questionnaire: QuestionnaireSchema;
  reveal: RevealContract;
  framing: "protagonist-or-companion" | "transmigration";
  sceneTone: "editorial" | "wish-fulfillment";
}
```

Modify the `PromptVariant` interface:

```ts
export interface PromptVariant extends PromptVariantMeta {
  capabilities: PromptVariantCapabilities;
  buildReveal(answers: TeyvatAnswers, framing: Framing, language: Language): string;
  buildScene(
    state: AdventureState,
    sceneNumber: number,
    previousChoice: string,
    language: Language
  ): string;
}
```

Add `capabilities` to both registry entries:

```ts
export const PROMPT_VARIANTS: PromptVariant[] = [
  {
    id: "v1",
    label: "v1 · editorial baseline",
    description:
      "The shipped reveal/scene prompts with the soft mapping table. Default arm of the A/B split.",
    weight: 1,
    capabilities: {
      questionnaire: editorialQuestionnaire,
      reveal: { kind: "single" },
      framing: "protagonist-or-companion",
      sceneTone: "editorial",
    },
    buildReveal: buildRevealV1,
    buildScene: buildSceneV1,
  },
  {
    id: "v2-tight",
    label: "v2 · tight",
    description:
      "Concise alternate: drops the soft mapping table and rewrites constraints as hard rules. Hypothesis: sharper output on strong models.",
    weight: 1,
    capabilities: {
      questionnaire: editorialQuestionnaire,
      reveal: { kind: "single" },
      framing: "protagonist-or-companion",
      sceneTone: "editorial",
    },
    buildReveal: buildRevealV2,
    buildScene: buildSceneV2,
  },
];
```

- [ ] **Step 4: Run the new test plus the existing variant tests**

```bash
npm test -- test/teyvat/promptVariants.capabilities.test.ts test/teyvat/promptVariants.test.ts test/teyvat/promptSwitch.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/promptVariants.ts test/teyvat/promptVariants.capabilities.test.ts
git commit -m "feat(teyvat): declare capabilities on v1 and v2-tight prompt variants"
```

---

## Task 9: Add the v2-wish variant — reveal returns candidates, scene leans wish-fulfillment

**Files:**
- Modify: `lib/teyvat/promptVariants.ts`
- Test: `test/teyvat/promptVariants.v2wish.test.ts` (new)

The v2-wish variant doesn't generate a reveal directly — its `buildReveal` is unused. Instead the candidates path bypasses it. We still need a `buildScene` that uses the wish framing and reads `awakeningHook` for scene 1.

- [ ] **Step 1: Write the failing test**

Create `test/teyvat/promptVariants.v2wish.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPromptVariant } from "@/lib/teyvat/promptVariants";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";
import type { AdventureState } from "@/lib/teyvat/scenes";

describe("v2-wish variant", () => {
  const v = getPromptVariant("v2-wish");

  it("is registered with id 'v2-wish'", () => {
    expect(v.id).toBe("v2-wish");
  });

  it("uses the wish questionnaire and candidates reveal contract", () => {
    expect(v.capabilities.questionnaire).toBe(wishQuestionnaire);
    expect(v.capabilities.reveal).toEqual({ kind: "candidates", min: 3, max: 5 });
    expect(v.capabilities.framing).toBe("transmigration");
    expect(v.capabilities.sceneTone).toBe("wish-fulfillment");
  });

  it("buildScene incorporates awakeningHook on scene 1", () => {
    const state: AdventureState = {
      id: "x",
      character: {
        framing: "protagonist",
        name: "Raiden Shogun",
        title: "—",
        vision: "Electro",
        nation: "Inazuma",
        weapon: "polearm",
        archetype: "Electro Archon",
        bio: "—",
        visionStory: "—",
        constellation: "—",
        signature: "—",
        knownAssociate: "",
        awakeningHook: "you wake at the top of Tenshukaku...",
      },
      scenes: [],
      ended: false,
      endedBy: null,
      startedAt: new Date().toISOString(),
      variantId: "v2-wish",
    };
    const prompt = v.buildScene(state, 1, "", "en");
    expect(prompt).toContain("you wake at the top of Tenshukaku");
  });

  it("buildScene does not duplicate awakeningHook on scenes after 1", () => {
    const state: AdventureState = {
      id: "x",
      character: {
        framing: "protagonist",
        name: "Raiden Shogun",
        title: "—",
        vision: "Electro",
        nation: "Inazuma",
        weapon: "polearm",
        archetype: "Electro Archon",
        bio: "—",
        visionStory: "—",
        constellation: "—",
        signature: "—",
        knownAssociate: "",
        awakeningHook: "UNIQUE_AWAKENING_TOKEN",
      },
      scenes: [
        { sceneNumber: 1, text: "x", choices: ["a", "b", "c"], closing: false, summary: "s", fromChoice: "" },
      ],
      ended: false,
      endedBy: null,
      startedAt: new Date().toISOString(),
      variantId: "v2-wish",
    };
    const prompt = v.buildScene(state, 2, "a", "en");
    expect(prompt).not.toContain("UNIQUE_AWAKENING_TOKEN");
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- test/teyvat/promptVariants.v2wish.test.ts
```

Expected: FAIL — `v2-wish` is not registered.

- [ ] **Step 3: Add the wish builders + register the variant**

Add to `lib/teyvat/promptVariants.ts` (after the v2-tight builders):

```ts
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";

/* ------------------------------------------------------------------
 * Variant: v2-wish (wish-fulfillment / 爽文)
 *
 * Casts canonical Genshin characters via the candidates pipeline;
 * the reveal builder here is unused (the candidate-pick step
 * handles selection). The scene builder leans into transmigration
 * framing and 爽文 escalation.
 * ------------------------------------------------------------------ */

function buildRevealWish(
  _answers: TeyvatAnswers,
  _framing: Framing,
  _language: Language
): string {
  // Unused — v2-wish goes through buildCandidatesPrompt + pickCandidate instead.
  // Returned only for type completeness.
  return "";
}

function buildSceneWish(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language
): string {
  const c = state.character;
  const outputLanguage = languageName(language);
  const storySoFar =
    state.scenes.length === 0
      ? "(scene 1 — the awakening)"
      : state.scenes
          .map(
            (scene) =>
              `${scene.sceneNumber}. ${scene.summary}${scene.fromChoice ? ` (chose: ${scene.fromChoice})` : ""}`
          )
          .join("\n");
  const fromChoiceLine = previousChoice
    ? `Last choice: ${previousChoice}`
    : "Opening scene — the awakening.";
  const pacing = pacingFor(sceneNumber);
  const isOpening = state.scenes.length === 0;
  const awakeningBlock =
    isOpening && c.awakeningHook
      ? `\nAwakening hook (anchor scene 1 on this — expand it, do not repeat it verbatim):\n${c.awakeningHook}\n`
      : "";

  return `Scene ${sceneNumber} of a wish-fulfillment (爽文) transmigration adventure set in Genshin Impact / Teyvat.

The reader has woken up as ${c.name} with their memories and powers intact. Lean into 爽文 tone: dominance shown through detail, validation arriving in concrete form, the world bending toward the protagonist.

Character: ${c.name} — ${c.vision} ${c.weapon} from ${c.nation}, ${c.archetype}.
Bio: ${c.bio}
${awakeningBlock}
Story so far:
${storySoFar}
${fromChoiceLine}
${pacingLine(pacing)}

Output language: ${outputLanguage}.

Rules:
- 3-5 paragraphs inside <scene>. Use ${c.vision} / ${c.nation} / ${c.weapon} concretely. End on dominance, declaration, or escalation rather than mere tension.
- Show overwhelming-ness through specific consequences (a foe stops mid-sentence, a court drops to its knees, a wall splits cleanly along a single strike). Avoid generic "you feel powerful" lines.
- Never mention prompts, choices-as-UI, questionnaire, or personality.
- Then exactly 3 <choices>, each 3-7 words. The choices should be assertive — actions the protagonist takes, not options the world offers.
- Then <closing>true|false</closing>.
- Then <summary> — exactly one sentence.

Output (use these tags in this order):
<scene>
[3-5 paragraphs]
</scene>
<choices>
[choice 1]
[choice 2]
[choice 3]
</choices>
<closing>true|false</closing>
<summary>
[one sentence]
</summary>`;
}
```

Append the v2-wish entry to `PROMPT_VARIANTS`:

```ts
  {
    id: "v2-wish",
    label: "v2 · wish-fulfillment",
    description:
      "转生成为雷电将军-style power fantasy. Different questionnaire, picks 3-5 canonical characters, runs a 爽文 transmigration adventure.",
    weight: 0, // do not include in random A/B; opt-in via picker for now
    capabilities: {
      questionnaire: wishQuestionnaire,
      reveal: { kind: "candidates", min: 3, max: 5 },
      framing: "transmigration",
      sceneTone: "wish-fulfillment",
    },
    buildReveal: buildRevealWish,
    buildScene: buildSceneWish,
  },
```

- [ ] **Step 4: Run the test**

```bash
npm test -- test/teyvat/promptVariants.v2wish.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full suite — make sure existing variants are untouched**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/promptVariants.ts test/teyvat/promptVariants.v2wish.test.ts
git commit -m "feat(teyvat): add v2-wish variant (wish-fulfillment 爽文 mode)"
```

---

## Task 10: Re-export candidates helpers from `prompts.ts`

**Files:**
- Modify: `lib/teyvat/prompts.ts`

The hook will import `buildCandidatesPrompt` and `parseCandidates` through the same surface as `buildRevealPrompt`. Just a small re-export so the public API stays consistent.

- [ ] **Step 1: Add the re-exports**

In `lib/teyvat/prompts.ts`, after the existing re-exports (around line 20), add:

```ts
export {
  buildCandidatesPrompt,
  parseCandidates,
  prefilterRoster,
  type CandidatesParseResult,
} from "@/lib/teyvat/candidates";

export { CANON_ROSTER, getCanonCharacter, type CanonCharacter } from "@/lib/teyvat/canonRoster";
```

- [ ] **Step 2: Run the suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/teyvat/prompts.ts
git commit -m "feat(teyvat): re-export candidates helpers + canon roster from prompts.ts"
```

---

## Task 11: Make `Questionnaire.tsx` schema-driven

**Files:**
- Modify: `components/teyvat/Questionnaire.tsx`

The component currently imports `TEYVAT_STEPS` and `CHAPTER_META` directly. We change it to receive a `QuestionnaireSchema` as a prop. The hook will pass the right schema for the active variant.

- [ ] **Step 1: Run the existing useAdventure tests so we have a baseline**

```bash
npm test -- test/teyvat/useAdventure.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Update the component**

Replace the imports near the top of `components/teyvat/Questionnaire.tsx`:

```ts
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import type { QuestionnaireSchema, TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import {
  BORDER_FAINT,
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  PARCHMENT,
} from "@/lib/teyvat/theme";
```

Update the `Props`:

```ts
interface Props {
  schema: QuestionnaireSchema;
  onComplete: (answers: TeyvatAnswers) => void;
}
```

Replace every reference to `TEYVAT_STEPS` with `schema.steps` and every reference to `CHAPTER_META` with `schema.chapterMeta`. Specifically:

- `TEYVAT_STEPS[screen.stepIndex]` → `schema.steps[screen.stepIndex]`
- `CHAPTER_META[step.chapter]` → `schema.chapterMeta[step.chapter]`
- `TEYVAT_STEPS.findIndex` → `schema.steps.findIndex`
- `TEYVAT_STEPS.map` → `schema.steps.map`
- `TEYVAT_STEPS.length - 1` → `schema.steps.length - 1`

Update `nextScreen` to take the schema:

```ts
function nextScreen(schema: QuestionnaireSchema, stepIndex: number): ScreenState | null {
  if (stepIndex >= schema.steps.length - 1) {
    return null;
  }
  const nextIndex = stepIndex + 1;
  const nextStep = schema.steps[nextIndex];
  const currentStep = schema.steps[stepIndex];
  if (nextStep.chapter !== currentStep.chapter) {
    return { kind: "intro", stepIndex: nextIndex };
  }
  return { kind: "question", stepIndex: nextIndex };
}
```

Update the call site:

```ts
const next = nextScreen(schema, screen.stepIndex);
```

The function signature becomes `export function Questionnaire({ schema, onComplete }: Props)`.

- [ ] **Step 3: Update the call site in `app/page.tsx`**

In `app/page.tsx`, the current call is:

```tsx
{phase === "questionnaire" ? (
  <Questionnaire onComplete={(answers) => void submitQuestionnaire(answers, lang)} />
) : null}
```

Change to:

```tsx
{phase === "questionnaire" ? (
  <Questionnaire schema={questionnaireSchema} onComplete={(answers) => void submitQuestionnaire(answers, lang)} />
) : null}
```

This requires `questionnaireSchema` to be exposed by `useAdventure`. Add it to the destructured set:

```tsx
const {
  // ...existing fields...
  questionnaireSchema,
  // ...
} = useAdventure();
```

The hook field will be added in Task 12. For now this fails to compile — that's expected since the whole flow change happens in the next task.

- [ ] **Step 4: Run the existing component tests so we know which fail**

```bash
npm test
```

Expected: FAIL on at least `app/page.tsx` and any tests that render `<Questionnaire>` without a schema. The next task fixes both.

- [ ] **Step 5: DO NOT COMMIT YET**

Move directly to Task 12. The build is intentionally broken between tasks 11 and 12.

---

## Task 12: Wire `useAdventure` for the v2-wish flow (the big change)

**Files:**
- Modify: `hooks/useAdventure.ts`
- Modify: `app/page.tsx`
- Test: `test/teyvat/useAdventure.test.tsx` (existing — must keep passing; add new cases)

This task adds `questionnaireSchema`, `candidates`, `pickCandidate`, the new phases, and the candidate fetch path.

- [ ] **Step 1: Read the existing test file to understand the patterns**

Read `test/teyvat/useAdventure.test.tsx` end-to-end. Note that it mocks `fetch` and exercises the hook via `renderHook` + `act`. Use the same patterns when adding new tests.

- [ ] **Step 2: Add new tests to `test/teyvat/useAdventure.test.tsx`**

Add at the end of the existing test file:

```ts
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";

describe("useAdventure — v2-wish flow", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("destiny-prompt-variant", "v2-wish");
    vi.restoreAllMocks();
  });

  it("exposes the wish questionnaire when promptVariant is v2-wish", async () => {
    const { result } = renderHook(() => useAdventure());
    await waitFor(() => {
      expect(result.current.promptVariant).toBe("v2-wish");
    });
    expect(result.current.questionnaireSchema).toBe(wishQuestionnaire);
  });

  it("submitQuestionnaire on v2-wish enters candidates-generating then candidate-pick", async () => {
    const candidatesPayload = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            candidates: [
              { id: CANON_ROSTER[0].id, hook: "you wake..." },
              { id: CANON_ROSTER[1].id, hook: "you wake..." },
              { id: CANON_ROSTER[2].id, hook: "you wake..." },
            ],
          }),
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(candidatesPayload), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const { result } = renderHook(() => useAdventure());
    await waitFor(() => expect(result.current.promptVariant).toBe("v2-wish"));

    await act(async () => {
      await result.current.submitQuestionnaire(
        {
          escape: "burnout",
          denied: "respect",
          dominance: "martial",
          pace: "instant",
          humble: "scorners",
          reward: "recognition",
          affinity: "electro",
        },
        "en"
      );
    });

    expect(result.current.phase).toBe("candidate-pick");
    expect(result.current.candidates?.length).toBe(3);
  });
});
```

- [ ] **Step 3: Run the new tests, confirm failure**

```bash
npm test -- test/teyvat/useAdventure.test.tsx
```

Expected: FAIL — `questionnaireSchema`, `candidates`, `pickCandidate` not exposed yet.

- [ ] **Step 4: Update `useAdventure.ts`**

Edit `hooks/useAdventure.ts`:

a) Update imports near the top:

```ts
import {
  buildCandidatesPrompt,
  buildRevealPrompt,
  buildScenePrompt,
  parseCandidates,
  parseReveal,
  parseSceneStream,
  prefilterRoster,
  CANON_ROSTER,
  getCanonCharacter,
  type CanonCharacter,
} from "@/lib/teyvat/prompts";
import {
  DEFAULT_PROMPT_VARIANT_ID,
  getPromptVariant,
  listPromptVariants,
  type PromptVariantMeta,
} from "@/lib/teyvat/promptVariants";
import type { QuestionnaireSchema } from "@/lib/teyvat/questionnaire";
```

b) Update `AdventurePhase`:

```ts
export type AdventurePhase =
  | "idle"
  | "bookshelf"
  | "questionnaire"
  | "revealing"
  | "candidates-generating"
  | "candidate-pick"
  | "reveal-shown"
  | "scene-generating"
  | "scene-shown"
  | "ended";
```

c) Add the candidate option type:

```ts
export interface CandidateOption {
  character: CanonCharacter;
  hook: string;
  imageUrl: string | null;
}
```

d) Update `UseAdventureResult` to add the new fields and method:

```ts
export interface UseAdventureResult {
  phase: AdventurePhase;
  character: RevealedCharacter | null;
  characterImageUrl: string | null;
  adventure: AdventureState | null;
  library: AdventureState[];
  streamingText: string;
  error: string | null;
  dailyRemaining: number | null;
  dailyLimit: number | null;
  provider: string;
  model: string;
  promptVariant: string;
  availablePromptVariants: PromptVariantMeta[];
  questionnaireSchema: QuestionnaireSchema;
  candidates: CandidateOption[] | null;
  hasSavedAdventure: boolean;
  begin(): void;
  openBookshelf(): void;
  closeBookshelf(): void;
  loadFromLibrary(id: string): boolean;
  submitQuestionnaire(answers: TeyvatAnswers, language: Language): Promise<void>;
  pickCandidate(id: string, language: Language): Promise<void>;
  enterWorld(language: Language): Promise<void>;
  chooseChoice(choice: string, language: Language): Promise<void>;
  stopHere(): void;
  startOver(): void;
  resumeAdventure(): boolean;
  setProvider(provider: string): void;
  setModel(model: string): void;
  setPromptVariant(id: string): void;
}
```

e) Inside `useAdventure()`, add new state:

```ts
const [candidates, setCandidates] = useState<CandidateOption[] | null>(null);
```

f) Compute the active questionnaire schema and reveal contract from the variant:

```ts
const activeVariant = getPromptVariant(promptVariant);
const questionnaireSchema = activeVariant.capabilities.questionnaire;
```

g) Replace the body of `submitQuestionnaire` with a branch on the reveal contract:

```ts
const submitQuestionnaire = useCallback(
  async (answers: TeyvatAnswers, language: Language) => {
    setError(null);
    setStreamingText("");

    const variant = getPromptVariant(promptVariant);
    if (variant.capabilities.reveal.kind === "candidates") {
      setPhase("candidates-generating");
      try {
        const prefiltered = prefilterRoster(CANON_ROSTER, answers);
        const allowedIds = new Set(prefiltered.map((c) => c.id));
        const prompt = buildCandidatesPrompt(answers, prefiltered, language);
        const raw = await callJsonModel([{ role: "user", content: prompt }], REVEAL_MAX_TOKENS);
        let parsed = parseCandidates(raw, allowedIds);
        if (!parsed.ok) {
          const errorList = parsed.errors.map((e) => `- ${e}`).join("\n");
          const retryPrompt = `${prompt}\n\nYour previous answer had these problems:\n${errorList}\n\nReturn valid JSON only, matching the schema exactly, with all problems above fixed.`;
          const retryRaw = await callJsonModel([{ role: "user", content: retryPrompt }], REVEAL_MAX_TOKENS);
          parsed = parseCandidates(retryRaw, allowedIds);
        }
        if (!parsed.ok) {
          throw new Error(parsed.errors.join(" | "));
        }
        const options: CandidateOption[] = parsed.candidates.map((entry) => {
          const character = getCanonCharacter(entry.id);
          // parseCandidates already enforced allowedIds, so character is guaranteed here.
          return { character: character!, hook: entry.hook, imageUrl: null };
        });
        setCandidates(options);
        setPhase("candidate-pick");

        // Fire-and-forget portrait generation per candidate.
        for (const option of options) {
          void (async () => {
            try {
              const portraitPrompt = `Genshin Impact official character portrait of ${option.character.nameEn}, anime illustration style, ${option.character.vision} vision wielder from ${option.character.nation}, using a ${option.character.weapon}, upper body, dramatic lighting. No text, no words, no letters, no watermarks, no signatures, no captions in the image.`;
              const response = await fetch("/api/imagine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: portraitPrompt }),
              });
              if (!response.ok) return;
              const data = (await response.json()) as { url?: string };
              if (data.url) {
                setCandidates((current) => {
                  if (!current) return current;
                  return current.map((c) =>
                    c.character.id === option.character.id ? { ...c, imageUrl: data.url ?? null } : c
                  );
                });
              }
            } catch {
              // best-effort; never blocks
            }
          })();
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Candidate suggestion failed.");
        setPhase("questionnaire");
      }
      return;
    }

    // single-reveal path (v1 / v2-tight) — unchanged behavior
    setPhase("revealing");
    const framing = rollFraming();
    const prompt = buildRevealPrompt(answers, framing, language, promptVariant);

    try {
      const firstRaw = await callJsonModel([{ role: "user", content: prompt }], REVEAL_MAX_TOKENS);
      let parsed = parseReveal(firstRaw, framing);

      if (!parsed.ok) {
        const errorList = parsed.errors.map((e) => `- ${e}`).join("\n");
        const retryPrompt = `${prompt}\n\nYour previous answer had these problems:\n${errorList}\n\nReturn valid JSON only, matching the schema exactly, with all problems above fixed.`;
        const retryRaw = await callJsonModel([{ role: "user", content: retryPrompt }], REVEAL_MAX_TOKENS);
        parsed = parseReveal(retryRaw, framing);
      }

      if (!parsed.ok) {
        throw new Error(parsed.errors.join(" | "));
      }

      const nextAdventure: AdventureState = {
        id: generateId(),
        character: parsed.character,
        scenes: [],
        ended: false,
        endedBy: null,
        startedAt: new Date().toISOString(),
        variantId: promptVariant,
      };

      setCharacter(parsed.character);
      setAdventure(nextAdventure);
      saveAdventure(nextAdventure);
      setHasSavedAdventure(true);
      setPhase("reveal-shown");

      void generateCharacterImage(parsed.character);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Reveal failed.");
      setPhase("questionnaire");
    }
  },
  [callJsonModel, generateCharacterImage, promptVariant]
);
```

h) Add the `pickCandidate` method:

```ts
const pickCandidate = useCallback(
  async (id: string, language: Language) => {
    if (!candidates) return;
    const option = candidates.find((o) => o.character.id === id);
    if (!option) return;

    const labels = { en: option.character.nameEn, zh: option.character.nameZh };
    const archetype = option.character.archetypeBlurb[language] ?? option.character.archetypeBlurb.en;
    const bio = option.character.bioBlurb[language] ?? option.character.bioBlurb.en;

    const character: RevealedCharacter = {
      framing: "protagonist",
      name: labels[language] ?? option.character.nameEn,
      title: option.character.nameEn, // fallback — canonical names are their own title
      vision: option.character.vision,
      nation: option.character.nation,
      weapon: option.character.weapon,
      archetype,
      bio,
      visionStory: option.hook,
      constellation: "—",
      signature: "—",
      knownAssociate: "",
      awakeningHook: option.hook,
    };

    const nextAdventure: AdventureState = {
      id: generateId(),
      character,
      scenes: [],
      ended: false,
      endedBy: null,
      startedAt: new Date().toISOString(),
      variantId: promptVariant,
    };

    setCharacter(character);
    setCharacterImageUrl(option.imageUrl);
    setAdventure(nextAdventure);
    saveAdventure(nextAdventure);
    setHasSavedAdventure(true);
    setCandidates(null);

    try {
      await generateScene(nextAdventure, "", language);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Scene generation failed.");
      setPhase("questionnaire");
    }
  },
  [candidates, generateScene, promptVariant]
);
```

i) Update `startOver` to reset `candidates` too:

```ts
const startOver = useCallback(() => {
  const current = loadAdventure();
  if (current && current.scenes.length > 0) {
    archiveToLibrary(current);
  }
  clearAdventure();
  setCharacter(null);
  setCharacterImageUrl(null);
  setAdventure(null);
  setCandidates(null);
  setStreamingText("");
  setError(null);
  setPhase("idle");
  setHasSavedAdventure(false);
  refreshLibrary();
}, [refreshLibrary]);
```

j) Add `questionnaireSchema`, `candidates`, and `pickCandidate` to the returned object.

- [ ] **Step 5: Update `app/page.tsx`**

Add `questionnaireSchema`, `candidates`, `pickCandidate` to the destructured set. Pass `schema` to `<Questionnaire>` as in Task 11. Add a new render block for `candidate-pick`:

```tsx
{phase === "candidates-generating" ? (
  <div style={loadingWrap}>
    <div style={loadingGlyph}>✦</div>
    <p style={loadingText}>{t("listening_for_name")}</p>
  </div>
) : null}

{phase === "candidate-pick" && candidates ? (
  <CandidateGallery
    candidates={candidates}
    onPick={(id) => void pickCandidate(id, lang)}
  />
) : null}
```

Add the import:

```tsx
import { CandidateGallery } from "@/components/teyvat/CandidateGallery";
```

NOTE: `CandidateGallery` is built in Task 13. The import will fail until then; intentional.

- [ ] **Step 6: DO NOT COMMIT YET**

The build remains broken because `CandidateGallery` doesn't exist. Move to Task 13.

---

## Task 13: `CandidateGallery` component

**Files:**
- Create: `components/teyvat/CandidateGallery.tsx`
- Modify: `i18n/index.tsx` (add gallery copy)
- Test: `test/teyvat/CandidateGallery.test.tsx`

- [ ] **Step 1: Add i18n strings**

In `i18n/index.tsx`, add to the English block (alongside existing keys like `bookshelf`):

```ts
choose_your_destiny: "Choose Your Destiny",
candidate_pick_hint: "One of these is the life waiting for you. Pick the one that pulls hardest.",
```

And to the Chinese block:

```ts
choose_your_destiny: "择命",
candidate_pick_hint: "其中之一，是已经在等你的命途。选那一束最强的牵引。",
```

- [ ] **Step 2: Write a failing component test**

Create `test/teyvat/CandidateGallery.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CandidateGallery } from "@/components/teyvat/CandidateGallery";
import { CANON_ROSTER } from "@/lib/teyvat/canonRoster";
import { I18nProvider } from "@/i18n";

const sampleCandidates = [
  { character: CANON_ROSTER[0], hook: "you wake at the top...", imageUrl: null },
  { character: CANON_ROSTER[1], hook: "the contract opens...", imageUrl: null },
  { character: CANON_ROSTER[2], hook: "the wind sings...", imageUrl: null },
];

function renderGallery(onPick = vi.fn()) {
  return render(
    <I18nProvider>
      <CandidateGallery candidates={sampleCandidates} onPick={onPick} />
    </I18nProvider>
  );
}

describe("CandidateGallery", () => {
  it("renders one card per candidate", () => {
    renderGallery();
    for (const c of sampleCandidates) {
      expect(screen.getByText(c.character.nameEn)).toBeInTheDocument();
    }
  });

  it("renders each candidate's hook", () => {
    renderGallery();
    for (const c of sampleCandidates) {
      expect(screen.getByText(c.hook)).toBeInTheDocument();
    }
  });

  it("calls onPick with the canon id when a card is clicked", () => {
    const onPick = vi.fn();
    renderGallery(onPick);
    const firstName = sampleCandidates[0].character.nameEn;
    fireEvent.click(screen.getByText(firstName).closest("button")!);
    expect(onPick).toHaveBeenCalledWith(sampleCandidates[0].character.id);
  });
});
```

- [ ] **Step 3: Run, confirm failure**

```bash
npm test -- test/teyvat/CandidateGallery.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the component**

Create `components/teyvat/CandidateGallery.tsx`:

```tsx
"use client";

import { useI18n } from "@/i18n";
import {
  BORDER_FAINT,
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  themeForVision,
} from "@/lib/teyvat/theme";
import type { CanonCharacter } from "@/lib/teyvat/canonRoster";

export interface CandidateOption {
  character: CanonCharacter;
  hook: string;
  imageUrl: string | null;
}

interface Props {
  candidates: CandidateOption[];
  onPick: (id: string) => void;
}

export function CandidateGallery({ candidates, onPick }: Props) {
  const { t, lang } = useI18n();

  return (
    <div style={wrap}>
      <div style={header}>
        <p style={eyebrow}>{t("choose_your_destiny")}</p>
        <p style={hint}>{t("candidate_pick_hint")}</p>
      </div>
      <div style={grid}>
        {candidates.map((candidate) => {
          const c = candidate.character;
          const theme = themeForVision(c.vision);
          const name = lang === "zh" ? c.nameZh : c.nameEn;
          return (
            <button
              key={c.id}
              type="button"
              style={{ ...card, borderColor: theme.border, background: theme.tint }}
              onClick={() => onPick(c.id)}
            >
              <div style={cardTop}>
                <span style={{ ...visionBadge, color: theme.emphasis }}>{c.vision}</span>
                <span style={meta}>{c.nation} · {c.weapon}</span>
              </div>
              {candidate.imageUrl ? (
                <img src={candidate.imageUrl} alt={c.nameEn} style={portrait} />
              ) : (
                <div style={portraitPlaceholder} />
              )}
              <p style={cardName}>{name}</p>
              <p style={hookText}>{candidate.hook}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minHeight: "100vh",
};

const header: React.CSSProperties = {
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: "clamp(2rem, 4.6vw, 3rem)",
  color: INK,
  margin: 0,
};

const hint: React.CSSProperties = {
  margin: "10px auto 0",
  maxWidth: 520,
  color: INK_SOFT,
  lineHeight: 1.65,
};

const grid: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const card: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "16px 18px",
  textAlign: "left",
  border: `1px solid ${BORDER_SOFT}`,
  cursor: "pointer",
};

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const visionBadge: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: 600,
};

const meta: React.CSSProperties = {
  fontSize: 11,
  color: INK_FAINT,
  letterSpacing: "0.06em",
};

const portrait: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  border: `1px solid ${BORDER_FAINT}`,
};

const portraitPlaceholder: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  background: "rgba(31,27,21,0.04)",
  border: `1px dashed ${BORDER_FAINT}`,
};

const cardName: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 22,
  fontWeight: 500,
  color: INK,
  margin: 0,
};

const hookText: React.CSSProperties = {
  fontSize: 14,
  color: INK_SOFT,
  lineHeight: 1.65,
  margin: 0,
};
```

- [ ] **Step 5: Run the gallery test**

```bash
npm test -- test/teyvat/CandidateGallery.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the full suite**

```bash
npm test
```

Expected: PASS — all the in-progress tests from tasks 11/12/13 should now light up.

- [ ] **Step 7: Commit the combined task 11/12/13 change**

```bash
git add components/teyvat/Questionnaire.tsx hooks/useAdventure.ts app/page.tsx components/teyvat/CandidateGallery.tsx i18n/index.tsx test/teyvat/CandidateGallery.test.tsx test/teyvat/useAdventure.test.tsx
git commit -m "feat(teyvat): wire v2-wish candidate-pick flow end-to-end"
```

---

## Task 14: Bookshelf variant family filter

**Files:**
- Modify: `lib/teyvat/promptVariants.ts` (add helper)
- Modify: `components/teyvat/Bookshelf.tsx`
- Modify: `i18n/index.tsx`

- [ ] **Step 1: Add the family helper**

In `lib/teyvat/promptVariants.ts`, after the registry, add:

```ts
export type VariantFamily = "editorial" | "wish-fulfillment" | "other";

export function variantFamily(id: string | undefined | null): VariantFamily {
  if (!id) return "editorial";
  if (id === "v1" || id === "v2-tight") return "editorial";
  if (id === "v2-wish") return "wish-fulfillment";
  return "other";
}
```

- [ ] **Step 2: Add filter copy to i18n**

Add to English:

```ts
filter_all: "All",
filter_editorial: "Editorial",
filter_wish: "Wish-fulfillment",
filter_other: "Other",
```

Chinese:

```ts
filter_all: "全部",
filter_editorial: "正传",
filter_wish: "爽文",
filter_other: "其他",
```

- [ ] **Step 3: Update `Bookshelf.tsx`**

Add a `filter` state alongside the existing `tab` state:

```ts
type Filter = "all" | "editorial" | "wish-fulfillment" | "other";
const [filter, setFilter] = useState<Filter>("all");
```

Import the helper:

```ts
import { variantFamily } from "@/lib/teyvat/promptVariants";
```

Add a filter chip row inside the panel, after `tabRow`:

```tsx
<div style={filterRow}>
  {(["all", "editorial", "wish-fulfillment", "other"] as Filter[]).map((f) => (
    <button
      key={f}
      type="button"
      style={filter === f ? chipActive : chipInactive}
      onClick={() => setFilter(f)}
    >
      {t(
        f === "all"
          ? "filter_all"
          : f === "editorial"
            ? "filter_editorial"
            : f === "wish-fulfillment"
              ? "filter_wish"
              : "filter_other"
      )}
    </button>
  ))}
</div>
```

Filter the library before rendering:

```ts
const filteredLibrary = filter === "all"
  ? library
  : library.filter((entry) => variantFamily(entry.variantId) === filter);
const filteredCharacters = filter === "all"
  ? characters
  : characters.filter((c) => variantFamily(c.from.variantId) === filter);
```

Replace the existing `library` and `characters` references inside the scroll area with `filteredLibrary` and `filteredCharacters`.

Also add styles:

```ts
const filterRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "12px 24px 0",
  flexWrap: "wrap",
};

const chipBase: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "5px 10px",
  border: `1px solid ${BORDER_FAINT}`,
  background: "transparent",
  cursor: "pointer",
};

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: INK,
  color: PARCHMENT,
  borderColor: INK,
};

const chipInactive: React.CSSProperties = {
  ...chipBase,
  color: INK_SOFT,
};
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Smoke-test the dev server**

```bash
npm run dev
```

In a browser, exercise: title → settings → switch to v2-wish → questionnaire → candidate gallery → pick → scene 1 → make a choice → scene 2 → stop here → bookshelf → filter chips. Confirm:

- The wish questionnaire shows seven questions across origin/power/desire chapters.
- Clicking a candidate transitions directly to a generating scene (no reveal-card view).
- The archived run appears under the "Wish-fulfillment" filter; switching to "Editorial" hides it.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/promptVariants.ts components/teyvat/Bookshelf.tsx i18n/index.tsx
git commit -m "feat(teyvat): bookshelf variant-family filter chips"
```

---

## Task 15: Update CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

CLAUDE.md mandates that docs are kept aligned with prompt-flow changes.

- [ ] **Step 1: Update CLAUDE.md**

In the "Prompt Switch System" / "Prompting" sections of CLAUDE.md, add a paragraph noting:

- v2-wish is the third registered variant.
- It uses `wishQuestionnaire` (in `lib/teyvat/questionnaires/wishQuestionnaire.ts`) and a `candidates` reveal contract.
- The flow inserts a `candidate-pick` phase between questionnaire and scene generation.
- Roster lives in `lib/teyvat/canonRoster.ts` (~25 entries).
- The Bookshelf groups runs by variant family (editorial / wish-fulfillment / other).

In Key Files, add:

```md
- [lib/teyvat/canonRoster.ts](lib/teyvat/canonRoster.ts) — canonical Genshin character roster used by v2-wish
- [lib/teyvat/candidates.ts](lib/teyvat/candidates.ts) — candidate pre-filter, prompt builder, and parser
- [lib/teyvat/questionnaires/](lib/teyvat/questionnaires/) — per-variant questionnaire schemas
- [components/teyvat/CandidateGallery.tsx](components/teyvat/CandidateGallery.tsx) — v2-wish candidate-pick UI
```

- [ ] **Step 2: Update README.md**

In the Runtime Flow section, mention the candidate-pick phase. In Architecture, add `CandidateGallery.tsx` to the components subtree. In the "Prompt switch system" sentence, note the v2-wish variant alongside v1 and v2-tight.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: document v2-wish prompt variant"
```

---

## Verification

After Task 15, run the full suite plus a build to catch type errors:

```bash
npm test
npm run lint
npm run build
```

Expected: all green.

Manual smoke test (one full run per variant):

1. **v1 (default)**: title → questionnaire (Mood/Desire/Conflict) → reveal card → enter world → scene 1 → choice → scene 2 → stop here → ending. Confirm Bookshelf "Editorial" filter shows the run.
2. **v2-tight**: same flow as v1 but with the variant picker set to v2-tight.
3. **v2-wish**: title → settings picker → v2-wish → questionnaire (Origin/Power/Desire) → candidate gallery (3-5 cards with hooks) → click one → scene 1 (opening uses the hook context) → choice → scene 2 → stop here → ending. Confirm Bookshelf "Wish-fulfillment" filter shows the run; "Editorial" filter hides it.
