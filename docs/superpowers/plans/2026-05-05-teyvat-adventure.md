# Teyvat Adventure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the destiny app to an interactive Genshin-world adventure: vague questionnaire → randomized character reveal (protagonist or companion) → open-ended branching scenes with vague choices and a soft-closure pacing matrix.

**Architecture:** Reuse the existing Next.js 15 + React 18 stack and the runtime engine (provider proxy, streaming, daily quotas, telemetry, rate limiting, retries, fallbacks). Replace the questionnaire, prompt builders, generation hook, page-level state, and the entire component tree under a new `lib/teyvat/` and `components/teyvat/` namespace. Drop Big5, the revolver UI, and the multi-pass denoise loop.

**Tech Stack:** Next.js 15, React 18, TypeScript, Vitest + @testing-library/react (jsdom), framer-motion (already in deps), Tailwind CSS via globals.css, the existing OpenRouter / xAI / Anthropic / Gemini provider adapters.

**Reference spec:** `docs/superpowers/specs/2026-05-05-teyvat-adventure-design.md`

---

## File map

### New files

| Path | Purpose |
|---|---|
| `lib/teyvat/elements.ts` | Element enum, nation enum, weapon enum, palette lookup. |
| `lib/teyvat/character.ts` | `Framing`, `RevealedCharacter`, validators. |
| `lib/teyvat/scenes.ts` | `Scene`, `AdventureState`, `parsedSceneFromStream` helper. |
| `lib/teyvat/questionnaire.ts` | The 7 questions across 3 chapters; localized labels + options. |
| `lib/teyvat/prompts.ts` | `buildRevealPrompt`, `parseReveal`, `buildScenePrompt`, `parseSceneStream`. |
| `lib/teyvat/storage.ts` | localStorage save/restore for `AdventureState`. |
| `lib/teyvat/theme.ts` | Element palette, font tokens. |
| `hooks/useAdventure.ts` | State machine for the whole flow. |
| `components/teyvat/TitleScreen.tsx` | Press-start screen. |
| `components/teyvat/Questionnaire.tsx` | Staged single-question screens. |
| `components/teyvat/RevealCard.tsx` | Staggered character reveal. |
| `components/teyvat/SceneView.tsx` | Streaming scene + choice buttons + stop. |
| `components/teyvat/AdventureLog.tsx` | Read-only history panel. |
| `components/teyvat/Ending.tsx` | Closing screen with re-read / new-run buttons. |
| `test/teyvat/elements.test.ts` | Enum + palette tests. |
| `test/teyvat/character.test.ts` | Character validator tests. |
| `test/teyvat/questionnaire.test.ts` | Questionnaire shape tests. |
| `test/teyvat/prompts.reveal.test.ts` | Reveal prompt + parser tests. |
| `test/teyvat/prompts.scene.test.ts` | Scene prompt + stream parser tests. |
| `test/teyvat/storage.test.ts` | Adventure persistence tests. |
| `test/teyvat/useAdventure.test.tsx` | Hook state machine tests. |
| `test/teyvat/RevealCard.test.tsx` | Reveal component test. |
| `test/teyvat/SceneView.test.tsx` | Scene component test. |

### Modified files

| Path | Change |
|---|---|
| `app/page.tsx` | Replaced wholesale: renders the new `useAdventure`-driven flow. |
| `lib/constants.ts` | Add `ADVENTURE_STORAGE_KEY`, `MAX_SCENES`, `SCENE_MAX_TOKENS`, `REVEAL_MAX_TOKENS`. Remove `STORY_STYLES` block, `BIG5_KEYS`, `NOISE_SCAN_COUNT`, `QUALITY_GATE_THRESHOLD`, `MAX_EXTRA_SHARPEN_PASSES`. |
| `types/index.ts` | Remove `Bullet`, `BulletStatus`, `REVOLVER_CHAMBERS`, `MAX_BULLET_PASSES`, `Fields`, `CurationAnswers`, `StoryConditioning`, `RunPhase`, `WorkflowStage`. Keep `Message`, `LLMRequest`, `AnthropicResponse`, `DailyQuota`, `Language`, `StreamingLLMRequest`. |
| `i18n/index.tsx` | Replace English/Chinese translation keys with the new Teyvat-flavored set. |
| `app/globals.css` | Add element-themed CSS variables and serif font import (Cormorant Garamond via Google Fonts). |
| `README.md` | Update product overview to describe the Teyvat adventure (in the same pass as the code). |
| `CLAUDE.md` | Update runtime notes section to match the new flow. |

### Deleted files

| Path | Reason |
|---|---|
| `components/Big5Form.tsx` | Big5 dropped. |
| `components/BulletField.tsx` | Revolver UI dropped. |
| `components/AmmoHUD.tsx` | Revolver UI dropped. |
| `components/CartridgeIcon.tsx` | Revolver UI dropped. |
| `components/CatchBurst.tsx` | Revolver UI dropped. |
| `components/FireImpact.tsx` | Revolver UI dropped. |
| `components/InputForm.tsx` | Replaced by `components/teyvat/Questionnaire.tsx`. |
| `components/StepIndicator.tsx` | Old workflow indicator. |
| `components/StoryRating.tsx` | Per-story rating not in v1. |
| `components/TrajectoryCard.tsx` | Old story output. |
| `components/WorkflowRail.tsx` | Old workflow rail. |
| `hooks/useGeneration.ts` | Replaced by `hooks/useAdventure.ts`. |
| `lib/prompts.ts` | Replaced by `lib/teyvat/prompts.ts`. |
| `lib/questionnaire.ts` | Replaced by `lib/teyvat/questionnaire.ts`. |
| `lib/revolver.ts` | Revolver dropped. |
| `lib/styles.ts` | Style picker dropped. |
| `lib/motion.ts` | Tied to revolver animations; new components use framer-motion directly. |
| `lib/devPreview.ts` | Tied to old flow. |
| `lib/theme.ts` | Replaced by `lib/teyvat/theme.ts`. |
| `test/AmmoHUD.test.tsx` | Component deleted. |
| `test/BulletField.test.tsx` | Component deleted. |
| `test/FireImpact.test.tsx` | Component deleted. |
| `test/questionnaire.test.ts` | Replaced by `test/teyvat/questionnaire.test.ts`. |
| `test/prompts.test.ts` | Replaced by `test/teyvat/prompts.*.test.ts`. |
| `test/revolver.test.ts` | Module deleted. |
| `test/useGeneration.test.tsx` | Replaced by `test/teyvat/useAdventure.test.tsx`. |

### Reused without change

- `app/api/generate/route.ts`, `app/api/generate/stream/route.ts`, `app/api/telemetry/route.ts`
- `lib/providers.ts`, `lib/rateLimit.ts`, `lib/telemetry.ts`, `lib/db.ts`, `lib/sessionId.ts`
- `app/layout.tsx`, `app/fonts.ts`
- `i18n/index.tsx` structure (only the keys change)

---

## Conventions used in this plan

- Test framework: vitest with `@testing-library/react` and jsdom (already configured).
- Tests live under `test/teyvat/` mirroring source structure (the existing repo puts tests in `test/`, not next to source).
- Run a single test file: `npx vitest run test/teyvat/<name>.test.ts`.
- Run all tests: `npm test`.
- Type check: `npx tsc --noEmit`.
- Lint: `npm run lint`.
- Commit messages follow the existing repo style (lowercase imperative, no trailing period, no Conventional Commits prefix). End each commit with the `Co-Authored-By` trailer this repo uses.

After every Task that lands code, run `npm test` and `npx tsc --noEmit` before committing. If either fails, fix forward in the same task — don't commit broken state.

---

## Task 1: Add Teyvat element / nation / weapon enums and palette

**Files:**
- Create: `lib/teyvat/elements.ts`
- Create: `test/teyvat/elements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/elements.test.ts
import { describe, expect, it } from "vitest";
import {
  VISIONS,
  NATIONS,
  WEAPONS,
  ELEMENT_PALETTE,
  isVision,
  isNation,
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
    expect(NATIONS).toContain("Mondstadt");
    expect(NATIONS).toContain("Natlan");
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
    for (const v of VISIONS) {
      expect(ELEMENT_PALETTE[v]).toBeDefined();
      expect(ELEMENT_PALETTE[v].accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(ELEMENT_PALETTE[v].tint).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(ELEMENT_PALETTE[v].emphasis).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("rejects unknown values via type guards", () => {
    expect(isVision("Anemo")).toBe(true);
    expect(isVision("Light")).toBe(false);
    expect(isNation("Liyue")).toBe(true);
    expect(isNation("Atlantis")).toBe(false);
    expect(isWeapon("sword")).toBe(true);
    expect(isWeapon("axe")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/elements.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```ts
// lib/teyvat/elements.ts
export const VISIONS = [
  "Anemo",
  "Geo",
  "Electro",
  "Dendro",
  "Hydro",
  "Pyro",
  "Cryo",
] as const;
export type Vision = (typeof VISIONS)[number];

export const NATIONS = [
  "Mondstadt",
  "Liyue",
  "Inazuma",
  "Sumeru",
  "Fontaine",
  "Natlan",
  "Snezhnaya",
  "wandering",
] as const;
export type Nation = (typeof NATIONS)[number];

export const WEAPONS = [
  "sword",
  "claymore",
  "polearm",
  "bow",
  "catalyst",
] as const;
export type Weapon = (typeof WEAPONS)[number];

export interface ElementPalette {
  accent: string;
  tint: string;
  emphasis: string;
}

export const ELEMENT_PALETTE: Record<Vision, ElementPalette> = {
  Anemo:   { accent: "#74c2a8", tint: "#e7f3ee", emphasis: "#3f7a65" },
  Geo:     { accent: "#d4a44b", tint: "#f6ecd5", emphasis: "#7a5a17" },
  Electro: { accent: "#9d7ad1", tint: "#ece4f4", emphasis: "#5a3f8a" },
  Dendro:  { accent: "#9bbf3f", tint: "#eef3d6", emphasis: "#566d22" },
  Hydro:   { accent: "#5aa6d4", tint: "#dceaf3", emphasis: "#2c5e7e" },
  Pyro:    { accent: "#d8694b", tint: "#f4dcd2", emphasis: "#8a3a22" },
  Cryo:    { accent: "#9bc8d4", tint: "#e2eef2", emphasis: "#3f6c7a" },
};

export function isVision(v: string): v is Vision {
  return (VISIONS as readonly string[]).includes(v);
}
export function isNation(n: string): n is Nation {
  return (NATIONS as readonly string[]).includes(n);
}
export function isWeapon(w: string): w is Weapon {
  return (WEAPONS as readonly string[]).includes(w);
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/elements.test.ts`
Expected: PASS, 5 assertions.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/elements.ts test/teyvat/elements.test.ts
git commit -m "$(cat <<'EOF'
add Teyvat element/nation/weapon enums and element palette

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add character + adventure-state types

**Files:**
- Create: `lib/teyvat/character.ts`
- Create: `lib/teyvat/scenes.ts`
- Create: `test/teyvat/character.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/character.test.ts
import { describe, expect, it } from "vitest";
import {
  validateRevealedCharacter,
  type RevealedCharacter,
} from "@/lib/teyvat/character";

const VALID: RevealedCharacter = {
  framing: "protagonist",
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads of Inazuma. Her maps have outlived three rulers. She owes no one a destination.",
  visionStory:
    "She was sketching the cliffs at Yashiori when the wave came. Holding the line of one stranger's pulse against the cold, she felt the ice answer — small, exact, hers. The Vision settled into her palm before the storm broke.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "",
};

describe("validateRevealedCharacter", () => {
  it("accepts a fully-formed protagonist", () => {
    const result = validateRevealedCharacter(VALID);
    expect(result.ok).toBe(true);
  });

  it("requires knownAssociate when framing is companion", () => {
    const result = validateRevealedCharacter({ ...VALID, framing: "companion", knownAssociate: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/knownAssociate/i);
  });

  it("rejects unknown vision", () => {
    const result = validateRevealedCharacter({ ...VALID, vision: "Light" as never });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown weapon", () => {
    const result = validateRevealedCharacter({ ...VALID, weapon: "axe" as never });
    expect(result.ok).toBe(false);
  });

  it("rejects empty visionStory", () => {
    const result = validateRevealedCharacter({ ...VALID, visionStory: "" });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/character.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/teyvat/character.ts`**

```ts
// lib/teyvat/character.ts
import {
  isNation,
  isVision,
  isWeapon,
  type Nation,
  type Vision,
  type Weapon,
} from "@/lib/teyvat/elements";

export type Framing = "protagonist" | "companion";

export interface RevealedCharacter {
  framing: Framing;
  name: string;
  vision: Vision;
  nation: Nation;
  weapon: Weapon;
  archetype: string;
  bio: string;
  visionStory: string;
  constellation: string;
  signature: string;
  /** Empty string when framing === "protagonist". */
  knownAssociate: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateRevealedCharacter(c: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof c !== "object" || c === null) {
    return { ok: false, errors: ["not an object"] };
  }
  const x = c as Record<string, unknown>;

  if (x.framing !== "protagonist" && x.framing !== "companion") {
    errors.push("framing must be 'protagonist' or 'companion'");
  }
  for (const field of ["name", "archetype", "bio", "visionStory", "constellation", "signature"] as const) {
    if (typeof x[field] !== "string" || (x[field] as string).trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof x.vision !== "string" || !isVision(x.vision)) {
    errors.push(`vision must be one of the seven Visions`);
  }
  if (typeof x.nation !== "string" || !isNation(x.nation)) {
    errors.push(`nation must be a known nation or "wandering"`);
  }
  if (typeof x.weapon !== "string" || !isWeapon(x.weapon)) {
    errors.push(`weapon must be one of: sword, claymore, polearm, bow, catalyst`);
  }
  if (typeof x.knownAssociate !== "string") {
    errors.push("knownAssociate must be a string");
  } else if (x.framing === "companion" && x.knownAssociate.trim() === "") {
    errors.push("knownAssociate is required when framing is 'companion'");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
```

- [ ] **Step 4: Implement `lib/teyvat/scenes.ts`**

```ts
// lib/teyvat/scenes.ts
import type { RevealedCharacter } from "@/lib/teyvat/character";

export interface Scene {
  sceneNumber: number;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
  /** The choice that led INTO this scene (empty for scene 1). */
  fromChoice: string;
}

export interface AdventureState {
  character: RevealedCharacter;
  scenes: Scene[];
  /** True once the user has either picked "stop here" or scene closing=true rendered. */
  ended: boolean;
  /** Reason for ending; controls the closing-card copy. */
  endedBy: "model" | "user" | null;
  /** Free-form ISO date string for telemetry. */
  startedAt: string;
}

export function nextSceneNumber(state: AdventureState): number {
  return state.scenes.length + 1;
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run test/teyvat/character.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/character.ts lib/teyvat/scenes.ts test/teyvat/character.test.ts
git commit -m "$(cat <<'EOF'
add RevealedCharacter and AdventureState types with validator

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add the new questionnaire (7 questions, 3 chapters)

**Files:**
- Create: `lib/teyvat/questionnaire.ts`
- Create: `test/teyvat/questionnaire.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/questionnaire.test.ts
import { describe, expect, it } from "vitest";
import {
  TEYVAT_STEPS,
  CHAPTER_META,
  type TeyvatAnswers,
  isComplete,
  type TeyvatStep,
} from "@/lib/teyvat/questionnaire";

describe("Teyvat questionnaire", () => {
  it("has exactly 7 questions across 3 chapters", () => {
    expect(TEYVAT_STEPS.length).toBe(7);
    const chapters = new Set(TEYVAT_STEPS.map((s) => s.chapter));
    expect(chapters).toEqual(new Set(["mood", "desire", "conflict"]));
  });

  it("provides English and Chinese chapter metadata", () => {
    expect(CHAPTER_META.mood.title.en).toBeTruthy();
    expect(CHAPTER_META.mood.title.zh).toBeTruthy();
    expect(CHAPTER_META.desire.title.en).toBeTruthy();
    expect(CHAPTER_META.conflict.title.en).toBeTruthy();
  });

  it("every step is single-select with 4 options", () => {
    for (const step of TEYVAT_STEPS) {
      expect(step.mode).toBe("single");
      expect(step.options.length).toBe(4);
      for (const opt of step.options) {
        expect(opt.id).toBeTruthy();
        expect(opt.label.en.length).toBeGreaterThan(0);
        expect(opt.label.zh.length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique step ids", () => {
    const ids = TEYVAT_STEPS.map((s: TeyvatStep) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("isComplete is true only when every step has an answer", () => {
    const partial: TeyvatAnswers = { [TEYVAT_STEPS[0].id]: TEYVAT_STEPS[0].options[0].value };
    expect(isComplete(partial)).toBe(false);

    const full: TeyvatAnswers = {};
    for (const step of TEYVAT_STEPS) {
      full[step.id] = step.options[0].value;
    }
    expect(isComplete(full)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/questionnaire.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```ts
// lib/teyvat/questionnaire.ts

export interface LocalizedText {
  en: string;
  zh: string;
}

export type ChapterKey = "mood" | "desire" | "conflict";

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

/** Answer map: step.id → chosen option.value */
export type TeyvatAnswers = Record<string, string>;

export const CHAPTER_META: Record<
  ChapterKey,
  { title: LocalizedText; subtitle: LocalizedText }
> = {
  mood: {
    title: { en: "Mood", zh: "心境" },
    subtitle: {
      en: "Where you are inside yourself, right now.",
      zh: "此刻你在自己内部的什么位置。",
    },
  },
  desire: {
    title: { en: "Desire", zh: "欲望" },
    subtitle: {
      en: "What you're actually reaching for.",
      zh: "你真正在伸手够的东西。",
    },
  },
  conflict: {
    title: { en: "Conflict", zh: "冲突" },
    subtitle: {
      en: "How you move when the path forks.",
      zh: "路口出现时,你怎么走。",
    },
  },
};

function opt(id: string, value: string, en: string, zh: string): TeyvatOption {
  return { id, value, label: { en, zh } };
}

export const TEYVAT_STEPS: TeyvatStep[] = [
  {
    id: "wakeNotice",
    chapter: "mood",
    mode: "single",
    title: {
      en: "You wake somewhere you don't recognize. What's the first thing you notice?",
      zh: "你在一个陌生的地方醒来。你最先注意到的是什么?",
    },
    options: [
      opt("silence", "the silence that isn't empty", "the silence that isn't empty", "并不空的寂静"),
      opt("rain", "a smell of rain on warm stone", "a smell of rain on warm stone", "暖石上的雨味"),
      opt("voices", "distant voices speaking a language you almost know", "distant voices speaking a language you almost know", "几乎能听懂的远处人声"),
      opt("glow", "something glowing at the edge of your vision", "something glowing at the edge of your vision", "余光里有什么在发光"),
    ],
  },
  {
    id: "weather",
    chapter: "mood",
    mode: "single",
    title: {
      en: "The weather you'd choose to walk in for hours:",
      zh: "你愿意走上几小时的天气:",
    },
    options: [
      opt("snow", "thin cold air after a snowfall", "thin cold air after a snowfall", "雪后稀薄的冷空气"),
      opt("sun", "midday heat with no shade", "midday heat with no shade", "无遮的正午暴晒"),
      opt("storm", "a storm that hasn't broken yet", "a storm that hasn't broken yet", "还未落下的雷雨"),
      opt("mist", "mist that hides whatever is ahead", "mist that hides whatever is ahead", "遮住前路的雾"),
    ],
  },
  {
    id: "trade",
    chapter: "desire",
    mode: "single",
    title: {
      en: "What would you trade almost anything for?",
      zh: "你几乎愿意拿一切去换的是什么?",
    },
    options: [
      opt("remembered", "to be remembered for one true thing", "to be remembered for one true thing", "因一件真东西被记住"),
      opt("disappear", "to disappear cleanly and start over", "to disappear cleanly and start over", "干净地消失,重新开始"),
      opt("knowOne", "to know something no one else knows", "to know something no one else knows", "知道一件无人知晓的事"),
      opt("protect", "to keep one person safe, no matter what", "to keep one person safe, no matter what", "无论如何让一个人平安"),
    ],
  },
  {
    id: "mark",
    chapter: "desire",
    mode: "single",
    title: {
      en: "The kind of mark you'd want to leave:",
      zh: "你想留下的那种痕迹:",
    },
    options: [
      opt("craft", "a craft so good people pass it down", "a craft so good people pass it down", "好到被传下去的手艺"),
      opt("question", "a question that outlives you", "a question that outlives you", "比你活得更久的问题"),
      opt("place", "a place that's safer because you were there", "a place that's safer because you were there", "因为你而更安全的某处"),
      opt("nothing", "nothing — you'd rather pass through", "nothing — you'd rather pass through", "什么也不留——你只想路过"),
    ],
  },
  {
    id: "power",
    chapter: "desire",
    mode: "single",
    title: {
      en: "When you imagine being powerful, the power looks like:",
      zh: "当你想象自己有力量时,那力量像什么:",
    },
    options: [
      opt("precision", "precision — doing one thing perfectly", "precision — doing one thing perfectly", "精准——把一件事做到完美"),
      opt("influence", "influence — people listening when you speak", "influence — people listening when you speak", "影响力——开口时人们会听"),
      opt("knowledge", "knowledge — seeing what others miss", "knowledge — seeing what others miss", "见识——看到别人漏掉的"),
      opt("guard", "protection — standing between harm and someone you love", "protection — standing between harm and someone you love", "庇护——挡在所爱与伤害之间"),
    ],
  },
  {
    id: "fork",
    chapter: "conflict",
    mode: "single",
    title: {
      en: "The road splits. Which pull do you trust?",
      zh: "路分叉了。你信任哪一种牵引?",
    },
    options: [
      opt("harder", "the harder climb", "the harder climb", "更难走的那条上坡"),
      opt("quieter", "the quieter road", "the quieter road", "更安静的那一条"),
      opt("company", "the one with company", "the one with company", "有同伴的那一条"),
      opt("untaken", "the one no one's taken", "the one no one's taken", "没人走过的那一条"),
    ],
  },
  {
    id: "break",
    chapter: "conflict",
    mode: "single",
    title: {
      en: "When something inside you finally breaks open, it sounds like:",
      zh: "当你内部终于裂开时,那声音像什么:",
    },
    options: [
      opt("breath", "a long-held breath let out", "a long-held breath let out", "憋了很久的一口气"),
      opt("blade", "a blade drawn slowly", "a blade drawn slowly", "缓慢出鞘的刀"),
      opt("laugh", "laughter you didn't expect", "laughter you didn't expect", "出乎意料的笑"),
      opt("decided", "silence — the kind that means you've decided", "silence — the kind that means you've decided", "寂静——意味着你已经决定"),
    ],
  },
];

export function isComplete(answers: TeyvatAnswers): boolean {
  return TEYVAT_STEPS.every((step) => Boolean(answers[step.id]));
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/questionnaire.test.ts`
Expected: PASS, 5 assertions.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/questionnaire.ts test/teyvat/questionnaire.test.ts
git commit -m "$(cat <<'EOF'
add Teyvat questionnaire — seven vague questions across mood/desire/conflict

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add reveal prompt builder + JSON parser

**Files:**
- Create: `lib/teyvat/prompts.ts` (this task adds the reveal half)
- Create: `test/teyvat/prompts.reveal.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/prompts.reveal.test.ts
import { describe, expect, it } from "vitest";
import { buildRevealPrompt, parseReveal } from "@/lib/teyvat/prompts";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";

const ANSWERS: TeyvatAnswers = {
  wakeNotice: "the silence that isn't empty",
  weather: "thin cold air after a snowfall",
  trade: "to know something no one else knows",
  mark: "a question that outlives you",
  power: "knowledge — seeing what others miss",
  fork: "the one no one's taken",
  break: "silence — the kind that means you've decided",
};

describe("buildRevealPrompt", () => {
  it("includes all seven answers verbatim", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    for (const value of Object.values(ANSWERS)) {
      expect(prompt).toContain(value);
    }
  });

  it("declares the framing in the prompt", () => {
    const protag = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const compan = buildRevealPrompt(ANSWERS, "companion", "en");
    expect(protag.toLowerCase()).toContain("protagonist");
    expect(compan.toLowerCase()).toContain("companion");
  });

  it("constrains the JSON output schema", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt).toContain("\"vision\"");
    expect(prompt).toContain("\"nation\"");
    expect(prompt).toContain("\"weapon\"");
    expect(prompt).toContain("\"visionStory\"");
    expect(prompt).toContain("\"knownAssociate\"");
  });

  it("specifies the output language", () => {
    const en = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const zh = buildRevealPrompt(ANSWERS, "protagonist", "zh");
    expect(en).toContain("English");
    expect(zh).toMatch(/Chinese|中文/i);
  });
});

describe("parseReveal", () => {
  const validJson = JSON.stringify({
    name: "Yuna",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "polearm",
    archetype: "Wandering Cartographer",
    bio: "Yuna walks the coastal roads. Her maps outlive rulers. She owes no one a destination.",
    visionStory:
      "She was sketching the cliffs at Yashiori when the wave came. Holding a stranger's pulse against the cold, she felt the ice answer — small, exact, hers.",
    constellation: "Lantern of Quiet Hours",
    signature: "A blade of ice that remembers the last hand it held.",
    knownAssociate: "",
  });

  it("parses raw JSON into a RevealedCharacter", () => {
    const result = parseReveal(validJson, "protagonist");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.name).toBe("Yuna");
      expect(result.character.vision).toBe("Cryo");
      expect(result.character.framing).toBe("protagonist");
    }
  });

  it("strips ```json code fences", () => {
    const wrapped = "```json\n" + validJson + "\n```";
    const result = parseReveal(wrapped, "protagonist");
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = parseReveal("not json", "protagonist");
    expect(result.ok).toBe(false);
  });

  it("rejects character with bad enum values", () => {
    const bad = JSON.parse(validJson);
    bad.vision = "Light";
    const result = parseReveal(JSON.stringify(bad), "protagonist");
    expect(result.ok).toBe(false);
  });

  it("attaches the framing to the parsed character", () => {
    const compan = JSON.parse(validJson);
    compan.knownAssociate = "Wanderer — they share a quiet contempt for fate";
    const result = parseReveal(JSON.stringify(compan), "companion");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.character.framing).toBe("companion");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/prompts.reveal.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the reveal half of `lib/teyvat/prompts.ts`**

```ts
// lib/teyvat/prompts.ts
import { TEYVAT_STEPS, type TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import {
  validateRevealedCharacter,
  type Framing,
  type RevealedCharacter,
} from "@/lib/teyvat/character";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

/**
 * Soft mapping cheat-sheet, given to the LLM as inspiration (not rules).
 * The LLM is told to blend signals across all 7 answers.
 */
const MAPPING_HINTS = `
Soft mapping hints (use as inspiration, not rules):
- Q "wakeNotice = silence that isn't empty" → contemplative archetype, possible Sumeru/Inazuma resonance
- Q "wakeNotice = something glowing" → curious/scholarly, Sumeru-leaning
- Q "wakeNotice = distant voices" → outsider/translator archetype, possibly Fontaine or Sumeru
- Q "weather = storm that hasn't broken" → Electro affinity, latent tension
- Q "weather = thin cold air" → Cryo affinity, discipline
- Q "weather = midday heat" → Pyro or Geo affinity, endurance
- Q "weather = mist that hides" → Anemo or Hydro affinity, exploratory
- Q "trade = to disappear cleanly" → wanderer/exile archetype, possibly Snezhnayan past
- Q "trade = to keep one person safe" → guardian archetype, polearm or claymore likely
- Q "power = precision" → catalyst or bow, scholar/sniper
- Q "power = protection" → Geo or Hydro guardian, claymore or polearm
- Q "fork = the one no one's taken" → wandering nation, probably companion-framing with similarly outcast canonicals
- Q "fork = the harder climb" → claymore-likely, mountainous nations (Liyue, Inazuma)
- Q "break = a blade drawn slowly" → sword/polearm wielder, deliberate
- Q "break = laughter you didn't expect" → Anemo affinity, Mondstadt-leaning

Blend across all answers. No single answer is deterministic.
`.trim();

function answersBlock(answers: TeyvatAnswers): string {
  return TEYVAT_STEPS.map((step) => {
    const value = answers[step.id] ?? "";
    return `- ${step.id}: ${value}`;
  }).join("\n");
}

export function buildRevealPrompt(
  answers: TeyvatAnswers,
  framing: Framing,
  language: string
): string {
  const lang = LANG_NAMES[language] ?? "English";
  const framingBlock =
    framing === "protagonist"
      ? `Framing: protagonist
- This character stands alone in their own story.
- No canonical Genshin character is in the spotlight.
- "knownAssociate" must be an empty string.`
      : `Framing: companion
- This character travels alongside ONE canonical Genshin character (e.g., Xiao, Zhongli, Raiden Shogun, Wanderer, Nahida, Furina).
- Pick one whose temperament contrasts or resonates with the reveal.
- Name them in "knownAssociate", followed by " — " and one phrase of relationship.`;

  return `You are writing a character reveal for an interactive Teyvat (Genshin Impact) adventure.

The reader gave these answers (translate emotional signal, do not echo phrasing):
${answersBlock(answers)}

${MAPPING_HINTS}

${framingBlock}

Output language: ${lang}.

Constraints:
- Do not echo the reader's answers back literally. Translate them into in-world detail.
- Do not name "Big Five", "personality", "questionnaire", or any meta language.
- "vision" must be one of: Anemo, Geo, Electro, Dendro, Hydro, Pyro, Cryo.
- "nation" must be one of: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, wandering.
- "weapon" must be one of: sword, claymore, polearm, bow, catalyst.
- "visionStory" is ONE moment of crisis or conviction — 3-4 sentences, in-scene, sensory. The Vision answers at the climax of that moment.
- "constellation" is 2-4 words, evocative, in Genshin's naming texture (e.g., "Lantern of Quiet Hours", "The Unanswered Blade").
- "signature" is one short flavor-text line, no game mechanics.

Return JSON only, no prose before or after, no code fences:
{
  "name": "...",
  "vision": "Cryo",
  "nation": "Inazuma",
  "weapon": "polearm",
  "archetype": "...",
  "bio": "...",
  "visionStory": "...",
  "constellation": "...",
  "signature": "...",
  "knownAssociate": "..."
}`;
}

function stripCodeFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export type RevealParseResult =
  | { ok: true; character: RevealedCharacter }
  | { ok: false; errors: string[] };

export function parseReveal(raw: string, framing: Framing): RevealParseResult {
  const stripped = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    return { ok: false, errors: [`invalid JSON: ${(e as Error).message}`] };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["parsed JSON is not an object"] };
  }
  const candidate = { framing, ...(parsed as object) } as RevealedCharacter;
  const validation = validateRevealedCharacter(candidate);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  return { ok: true, character: candidate };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/prompts.reveal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/prompts.ts test/teyvat/prompts.reveal.test.ts
git commit -m "$(cat <<'EOF'
add reveal prompt builder and JSON parser for Teyvat character cards

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add scene prompt builder + streaming tag parser

**Files:**
- Modify: `lib/teyvat/prompts.ts`
- Create: `test/teyvat/prompts.scene.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/prompts.scene.test.ts
import { describe, expect, it } from "vitest";
import {
  buildScenePrompt,
  parseSceneStream,
} from "@/lib/teyvat/prompts";
import type { AdventureState } from "@/lib/teyvat/scenes";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const CHARACTER: RevealedCharacter = {
  framing: "companion",
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
  visionStory: "Yashiori. The wave. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "Wanderer — they share a quiet contempt for fate",
};

const STATE: AdventureState = {
  character: CHARACTER,
  scenes: [
    {
      sceneNumber: 1,
      text: "She arrived at the gate at dusk...",
      choices: ["follow the voice", "stay where you are", "turn back"],
      closing: false,
      summary: "Yuna reached the unmarked gate at Tatarasuna.",
      fromChoice: "",
    },
  ],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-05T00:00:00Z",
};

describe("buildScenePrompt", () => {
  it("includes character details and story-so-far", () => {
    const p = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(p).toContain("Yuna");
    expect(p).toContain("Cryo");
    expect(p).toContain("polearm");
    expect(p).toContain("Yuna reached the unmarked gate at Tatarasuna.");
    expect(p).toContain("follow the voice");
  });

  it("mentions the companion when framing is companion", () => {
    const p = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(p).toContain("Wanderer");
  });

  it("injects different pacing guidance per scene number", () => {
    const s1 = buildScenePrompt(STATE, 1, "", "en");
    const s5 = buildScenePrompt(STATE, 5, "x", "en");
    const s10 = buildScenePrompt(STATE, 10, "x", "en");
    expect(s1.toLowerCase()).toContain("the call");
    expect(s5.toLowerCase()).toMatch(/climax|close/);
    expect(s10.toLowerCase()).toMatch(/closing.*true|land the plane/);
  });

  it("declares the streaming tag format", () => {
    const p = buildScenePrompt(STATE, 2, "follow the voice", "en");
    expect(p).toContain("<scene>");
    expect(p).toContain("</scene>");
    expect(p).toContain("<choices>");
    expect(p).toContain("<closing>");
    expect(p).toContain("<summary>");
  });
});

describe("parseSceneStream", () => {
  const completed = `<scene>
She crossed the threshold. The cold of her own Vision stilled her.

A voice called her name from inside the gate.
</scene>
<choices>
follow the voice
stay where you are
turn back into the rain
</choices>
<closing>false</closing>
<summary>
Yuna crossed the gate and a voice called her name.
</summary>`;

  it("parses a complete scene", () => {
    const result = parseSceneStream(completed);
    expect(result.complete).toBe(true);
    expect(result.text).toMatch(/She crossed/);
    expect(result.choices).toEqual([
      "follow the voice",
      "stay where you are",
      "turn back into the rain",
    ]);
    expect(result.closing).toBe(false);
    expect(result.summary).toBe("Yuna crossed the gate and a voice called her name.");
  });

  it("returns partial state during streaming (only <scene> open)", () => {
    const partial = "<scene>\nShe crossed the threshold. The cold of her own Vision";
    const result = parseSceneStream(partial);
    expect(result.complete).toBe(false);
    expect(result.text).toContain("She crossed");
    expect(result.choices).toEqual([]);
  });

  it("treats the next <choices> tag as a tolerant scene-terminator", () => {
    // Model dropped the </scene> close tag.
    const sloppy = `<scene>
She crossed the threshold.
<choices>
follow the voice
stay where you are
turn back
</choices>
<closing>true</closing>
<summary>
Yuna crossed.
</summary>`;
    const result = parseSceneStream(sloppy);
    expect(result.complete).toBe(true);
    expect(result.text).toContain("She crossed");
    expect(result.choices.length).toBe(3);
    expect(result.closing).toBe(true);
  });

  it("parses closing=true", () => {
    const closingScene = completed.replace("<closing>false</closing>", "<closing>true</closing>");
    const result = parseSceneStream(closingScene);
    expect(result.closing).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/prompts.scene.test.ts`
Expected: FAIL — `buildScenePrompt` / `parseSceneStream` not exported.

- [ ] **Step 3: Add scene helpers to `lib/teyvat/prompts.ts`**

Append to the existing file:

```ts
// lib/teyvat/prompts.ts (additions)
import type { AdventureState } from "@/lib/teyvat/scenes";

interface PacingHint {
  short: string;
  closingPolicy: "must-be-false" | "may-close" | "should-close" | "must-close";
}

const PACING: Record<number, PacingHint> = {
  1: { short: "The call. Establish where the character is and what's pulling them in. End on the first crossroad.", closingPolicy: "must-be-false" },
  2: { short: "First commitment. The choice from scene 1 has consequences. Stakes become real.", closingPolicy: "must-be-false" },
  3: { short: "Complication. Something the character didn't expect. Old assumptions strain.", closingPolicy: "must-be-false" },
  4: { short: "Crisis approaches. The shape of the real conflict becomes clear.", closingPolicy: "may-close" },
  5: { short: "Climax window. Strong place to close. Prefer closing=true unless a clear thread demands extension.", closingPolicy: "should-close" },
  6: { short: "Closure expected. Strong push to closing=true. Only continue if a major thread is unresolved.", closingPolicy: "should-close" },
};

function pacingFor(n: number): PacingHint {
  if (n <= 6) return PACING[n];
  return { short: "Land the plane. closing must be true. Write a real ending.", closingPolicy: "must-close" };
}

function pacingLine(p: PacingHint): string {
  const policy =
    p.closingPolicy === "must-be-false"
      ? "Set closing to false."
      : p.closingPolicy === "may-close"
      ? "Set closing to true ONLY if the arc has reached a satisfying ending; otherwise false."
      : p.closingPolicy === "should-close"
      ? "Strongly prefer closing=true. Only set closing=false if a major thread is genuinely unresolved."
      : "closing MUST be true. Write a real ending.";
  return `Pacing for this scene: ${p.short} ${policy}`;
}

export function buildScenePrompt(
  state: AdventureState,
  sceneNumber: number,
  fromChoice: string,
  language: string
): string {
  const lang = LANG_NAMES[language] ?? "English";
  const c = state.character;
  const pacing = pacingFor(sceneNumber);

  const storySoFar = state.scenes.length === 0
    ? "(this is the opening scene)"
    : state.scenes
        .map((s) => `Scene ${s.sceneNumber}: ${s.summary}` + (s.fromChoice ? ` → They chose: "${s.fromChoice}"` : ""))
        .join("\n");

  const fromChoiceLine = fromChoice
    ? `\nThey just chose: "${fromChoice}". This scene is the consequence.\n`
    : "";

  const companionLine =
    c.framing === "companion"
      ? `- Traveling with: ${c.knownAssociate}\n  ${c.knownAssociate.split(" — ")[0]} should appear or be felt in this scene — they are a presence, not a cameo.`
      : "";

  return `You are writing scene ${sceneNumber} of an interactive adventure in Teyvat (Genshin Impact).

Character:
- Name: ${c.name}
- Vision: ${c.vision} | Nation: ${c.nation} | Weapon: ${c.weapon}
- Archetype: ${c.archetype}
- Bio: ${c.bio}
${companionLine}

Story so far:
${storySoFar}
${fromChoiceLine}
${pacingLine(pacing)}

Constraints:
- 3-5 paragraphs of prose inside <scene> tags.
- Use the character's element, nation, and weapon as concrete sensory detail. A ${c.vision} ${c.nation} scene should feel specific to that combination, not generic fantasy.
- Do not name "Big Five", "questionnaire", or any meta language.
- End the scene at a moment of tension or decision.
- Choices: 3 vague evocative phrases (3-7 words each), no game mechanics, no obvious good/bad framing. Each must lead to a meaningfully different next scene.
- Summary: ONE sentence recap, used internally for continuity. Do not describe choices in the summary.

Output language: ${lang}.

Output format (use these exact tags, in this order):
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

export interface ParsedSceneStream {
  /** True once <choices> AND <closing> AND <summary> have all closed. */
  complete: boolean;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
}

export function parseSceneStream(raw: string): ParsedSceneStream {
  const out: ParsedSceneStream = {
    complete: false,
    text: "",
    choices: [],
    closing: false,
    summary: "",
  };

  // Tolerant scene extraction: from after <scene> to the first of </scene> or <choices>.
  const sceneOpen = raw.indexOf("<scene>");
  if (sceneOpen >= 0) {
    const afterOpen = sceneOpen + "<scene>".length;
    const closeIdx = raw.indexOf("</scene>", afterOpen);
    const choicesIdx = raw.indexOf("<choices>", afterOpen);
    const candidates = [closeIdx, choicesIdx].filter((i) => i >= 0);
    const sceneEnd = candidates.length > 0 ? Math.min(...candidates) : raw.length;
    out.text = raw.slice(afterOpen, sceneEnd).trim();
  }

  const choicesBlock = matchTag(raw, "choices");
  if (choicesBlock !== null) {
    out.choices = choicesBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const closingBlock = matchTag(raw, "closing");
  if (closingBlock !== null) {
    out.closing = closingBlock.trim().toLowerCase() === "true";
  }

  const summaryBlock = matchTag(raw, "summary");
  if (summaryBlock !== null) {
    out.summary = summaryBlock.trim();
  }

  out.complete =
    choicesBlock !== null && closingBlock !== null && summaryBlock !== null;
  return out;
}

function matchTag(raw: string, tag: string): string | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = raw.indexOf(open);
  if (start < 0) return null;
  const end = raw.indexOf(close, start + open.length);
  if (end < 0) return null;
  return raw.slice(start + open.length, end);
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/prompts.scene.test.ts`
Expected: PASS.

- [ ] **Step 5: Run all tests + type check**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. (Old `test/prompts.test.ts` still passes because we haven't touched `lib/prompts.ts` yet.)

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/prompts.ts test/teyvat/prompts.scene.test.ts
git commit -m "$(cat <<'EOF'
add scene prompt builder and tolerant streaming tag parser

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add adventure persistence (localStorage)

**Files:**
- Create: `lib/teyvat/storage.ts`
- Create: `test/teyvat/storage.test.ts`
- Modify: `lib/constants.ts` (add `ADVENTURE_STORAGE_KEY`, `MAX_SCENES`, `REVEAL_MAX_TOKENS`, `SCENE_MAX_TOKENS`)

- [ ] **Step 1: Write the failing test**

```ts
// test/teyvat/storage.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  saveAdventure,
  loadAdventure,
  clearAdventure,
} from "@/lib/teyvat/storage";
import type { AdventureState } from "@/lib/teyvat/scenes";

const STATE: AdventureState = {
  character: {
    framing: "protagonist",
    name: "Yuna",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "polearm",
    archetype: "Wandering Cartographer",
    bio: "Yuna walks the coastal roads.",
    visionStory: "She was sketching when the wave came.",
    constellation: "Lantern of Quiet Hours",
    signature: "A blade of ice.",
    knownAssociate: "",
  },
  scenes: [],
  ended: false,
  endedBy: null,
  startedAt: "2026-05-05T00:00:00Z",
};

describe("adventure storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is saved", () => {
    expect(loadAdventure()).toBeNull();
  });

  it("round-trips a saved adventure", () => {
    saveAdventure(STATE);
    expect(loadAdventure()).toEqual(STATE);
  });

  it("clearAdventure removes saved state", () => {
    saveAdventure(STATE);
    clearAdventure();
    expect(loadAdventure()).toBeNull();
  });

  it("loadAdventure returns null on corrupted JSON", () => {
    localStorage.setItem("destiny-adventure-state", "not json");
    expect(loadAdventure()).toBeNull();
  });

  it("loadAdventure returns null when character validation fails", () => {
    const bad = { ...STATE, character: { ...STATE.character, vision: "Light" } };
    localStorage.setItem("destiny-adventure-state", JSON.stringify(bad));
    expect(loadAdventure()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add constants to `lib/constants.ts`**

Edit `lib/constants.ts`. After the existing exports (before the `STORY_STYLES` block), add:

```ts
// Teyvat-adventure constants
export const ADVENTURE_STORAGE_KEY = "destiny-adventure-state";
export const MAX_SCENES = 10;
export const REVEAL_MAX_TOKENS = 1500;
export const SCENE_MAX_TOKENS = 1200;
```

- [ ] **Step 4: Implement `lib/teyvat/storage.ts`**

```ts
// lib/teyvat/storage.ts
import { ADVENTURE_STORAGE_KEY } from "@/lib/constants";
import { validateRevealedCharacter } from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";

export function saveAdventure(state: AdventureState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or disabled — silently drop, telemetry isn't blocking
  }
}

export function loadAdventure(): AdventureState | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as AdventureState;
  if (!candidate.character) return null;
  const valid = validateRevealedCharacter(candidate.character);
  if (!valid.ok) return null;
  if (!Array.isArray(candidate.scenes)) return null;
  return candidate;
}

export function clearAdventure(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ADVENTURE_STORAGE_KEY);
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run test/teyvat/storage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/storage.ts test/teyvat/storage.test.ts lib/constants.ts
git commit -m "$(cat <<'EOF'
add adventure localStorage persistence with validation on load

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add the Teyvat theme tokens

**Files:**
- Create: `lib/teyvat/theme.ts`

This task has no dedicated test (pure data module — covered indirectly by component tests later).

- [ ] **Step 1: Implement the theme module**

```ts
// lib/teyvat/theme.ts
import { ELEMENT_PALETTE, type Vision } from "@/lib/teyvat/elements";

/** Display font (serif) for headers and the reveal card. */
export const FONT_DISPLAY = "'Cormorant Garamond', 'Times New Roman', serif";
/** Body font (humanist sans). */
export const FONT_BODY =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Neutral parchment background for non-element-tinted screens. */
export const PARCHMENT = "#f5ecd9";
export const INK = "#1f1b15";
export const INK_SOFT = "#4a4439";
export const INK_FAINT = "#8a8170";
export const BORDER_FAINT = "rgba(31,27,21,0.08)";
export const BORDER_SOFT = "rgba(31,27,21,0.16)";

export interface ThemeForVision {
  accent: string;
  tint: string;
  emphasis: string;
  background: string;
  foreground: string;
  border: string;
}

export function themeForVision(v: Vision): ThemeForVision {
  const palette = ELEMENT_PALETTE[v];
  return {
    accent: palette.accent,
    tint: palette.tint,
    emphasis: palette.emphasis,
    background: PARCHMENT,
    foreground: INK,
    border: BORDER_SOFT,
  };
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/teyvat/theme.ts
git commit -m "$(cat <<'EOF'
add Teyvat theme tokens with per-vision palette

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Replace globals.css with parchment palette + serif font

**Files:**
- Modify: `app/globals.css`

This task wipes the old editorial theme and replaces it with parchment+ink. The exact existing CSS is large; we replace its top-level CSS variables and base styles. (Component-scoped styles in old components don't matter since those components are deleted in Task 17.)

- [ ] **Step 1: Read current globals.css to get its shape**

Run: `wc -l app/globals.css` (informational only).

- [ ] **Step 2: Replace globals.css**

Overwrite `app/globals.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');

:root {
  --parchment: #f5ecd9;
  --ink: #1f1b15;
  --ink-soft: #4a4439;
  --ink-faint: #8a8170;
  --border-faint: rgba(31, 27, 21, 0.08);
  --border-soft: rgba(31, 27, 21, 0.16);
  --font-display: 'Cormorant Garamond', 'Times New Roman', serif;
  --font-body: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--parchment);
  color: var(--ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}

h1, h2, h3, .display {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: 0.01em;
  margin: 0;
}

button {
  font-family: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

a {
  color: inherit;
}

/* Subtle paper texture overlay (optional, very faint). */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(31,27,21,0.025) 1px, transparent 1px);
  background-size: 4px 4px;
  z-index: 0;
}

#__next, main {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 3: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (Lint errors from soon-to-be-deleted files are acceptable; if any block the run, note them but proceed — Task 17 deletes them.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
replace globals.css with parchment palette and serif display font

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Add the `useAdventure` hook

The hook owns the state machine: `idle → questionnaire → revealing → reveal-shown → scene-generating → scene-shown → ended`. It calls the existing `/api/generate` (non-streaming) for the reveal and `/api/generate/stream` (streaming) for scenes.

**Files:**
- Create: `hooks/useAdventure.ts`
- Create: `test/teyvat/useAdventure.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// test/teyvat/useAdventure.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdventure } from "@/hooks/useAdventure";

const REVEAL_JSON = JSON.stringify({
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads.",
  visionStory: "She was sketching when the wave came.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice.",
  knownAssociate: "",
});

const SCENE_RESPONSE = `<scene>
She crossed the threshold.
</scene>
<choices>
follow the voice
stay where you are
turn back
</choices>
<closing>false</closing>
<summary>
Yuna crossed the gate.
</summary>`;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSequence(responses: Array<{ ok: boolean; body: string; stream?: boolean }>) {
  let i = 0;
  vi.spyOn(global, "fetch").mockImplementation(async () => {
    const r = responses[i++];
    if (r.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: r.body })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: r.body }] }),
      { status: r.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
    );
  });
}

describe("useAdventure", () => {
  it("starts in 'idle' phase", () => {
    const { result } = renderHook(() => useAdventure());
    expect(result.current.phase).toBe("idle");
  });

  it("transitions through phases on a full happy path", async () => {
    mockFetchSequence([
      { ok: true, body: REVEAL_JSON },
      { ok: true, body: SCENE_RESPONSE, stream: true },
    ]);
    const { result } = renderHook(() => useAdventure());

    act(() => {
      result.current.beginAdventure(
        {
          wakeNotice: "the silence that isn't empty",
          weather: "thin cold air after a snowfall",
          trade: "to know something no one else knows",
          mark: "a question that outlives you",
          power: "knowledge — seeing what others miss",
          fork: "the one no one's taken",
          break: "silence — the kind that means you've decided",
        },
        "en"
      );
    });

    await waitFor(() => expect(result.current.phase).toBe("reveal-shown"), { timeout: 2000 });
    expect(result.current.state?.character.name).toBe("Yuna");

    act(() => {
      result.current.advanceFromReveal();
    });

    await waitFor(() => expect(result.current.phase).toBe("scene-shown"), { timeout: 2000 });
    expect(result.current.state?.scenes.length).toBe(1);
    expect(result.current.state?.scenes[0].choices).toContain("follow the voice");
  });

  it("ends adventure when user picks stop", async () => {
    mockFetchSequence([
      { ok: true, body: REVEAL_JSON },
      { ok: true, body: SCENE_RESPONSE, stream: true },
    ]);
    const { result } = renderHook(() => useAdventure());

    act(() => {
      result.current.beginAdventure(
        {
          wakeNotice: "x", weather: "x", trade: "x", mark: "x",
          power: "x", fork: "x", break: "x",
        },
        "en"
      );
    });
    await waitFor(() => expect(result.current.phase).toBe("reveal-shown"), { timeout: 2000 });
    act(() => result.current.advanceFromReveal());
    await waitFor(() => expect(result.current.phase).toBe("scene-shown"), { timeout: 2000 });

    act(() => result.current.stopHere());

    expect(result.current.phase).toBe("ended");
    expect(result.current.state?.endedBy).toBe("user");
  });

  it("ends adventure when scene returns closing=true", async () => {
    const closing = SCENE_RESPONSE.replace(
      "<closing>false</closing>",
      "<closing>true</closing>"
    );
    mockFetchSequence([
      { ok: true, body: REVEAL_JSON },
      { ok: true, body: closing, stream: true },
    ]);
    const { result } = renderHook(() => useAdventure());

    act(() => {
      result.current.beginAdventure(
        {
          wakeNotice: "x", weather: "x", trade: "x", mark: "x",
          power: "x", fork: "x", break: "x",
        },
        "en"
      );
    });
    await waitFor(() => expect(result.current.phase).toBe("reveal-shown"), { timeout: 2000 });
    act(() => result.current.advanceFromReveal());
    await waitFor(() => expect(result.current.phase).toBe("ended"), { timeout: 2000 });
    expect(result.current.state?.endedBy).toBe("model");
  });

  it("resets to idle on resetAdventure", async () => {
    const { result } = renderHook(() => useAdventure());
    act(() => result.current.resetAdventure());
    expect(result.current.phase).toBe("idle");
    expect(result.current.state).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/useAdventure.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `hooks/useAdventure.ts`**

```ts
// hooks/useAdventure.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  REVEAL_MAX_TOKENS,
  SCENE_MAX_TOKENS,
  MAX_SCENES,
  API_ROUTE,
  STREAMING_API_ROUTE,
  DEFAULT_PROVIDER,
  PROVIDERS,
} from "@/lib/constants";
import { buildRevealPrompt, parseReveal, buildScenePrompt, parseSceneStream } from "@/lib/teyvat/prompts";
import { saveAdventure, loadAdventure, clearAdventure } from "@/lib/teyvat/storage";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { Framing } from "@/lib/teyvat/character";
import type { AdventureState, Scene } from "@/lib/teyvat/scenes";
import type { Language, Message } from "@/types";

export type AdventurePhase =
  | "idle"
  | "questionnaire"
  | "revealing"
  | "reveal-shown"
  | "scene-generating"
  | "scene-shown"
  | "ended";

export interface UseAdventureResult {
  phase: AdventurePhase;
  state: AdventureState | null;
  error: string | null;
  /** Streaming partial text for the current scene (empty between scenes). */
  streamingText: string;
  beginAdventure(answers: TeyvatAnswers, language: Language): Promise<void>;
  advanceFromReveal(): Promise<void>;
  pickChoice(choice: string): Promise<void>;
  stopHere(): void;
  resetAdventure(): void;
  resumeAdventure(): boolean;
}

function rollFraming(): Framing {
  return Math.random() < 0.5 ? "protagonist" : "companion";
}

function defaultModel(): string {
  return PROVIDERS[DEFAULT_PROVIDER]?.[0] ?? "anthropic/claude-sonnet-4.6";
}

export function useAdventure(): UseAdventureResult {
  const [phase, setPhase] = useState<AdventurePhase>("idle");
  const [state, setState] = useState<AdventureState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>("");
  const [language, setLanguage] = useState<Language>("en");

  // Persist after every state change so refresh-mid-run works.
  useEffect(() => {
    if (state && (phase === "scene-shown" || phase === "ended")) {
      saveAdventure(state);
    }
  }, [state, phase]);

  const beginAdventure = useCallback(async (answers: TeyvatAnswers, lang: Language) => {
    setLanguage(lang);
    setError(null);
    setPhase("revealing");
    const framing = rollFraming();
    const prompt = buildRevealPrompt(answers, framing, lang);

    const messages: Message[] = [{ role: "user", content: prompt }];
    try {
      const res = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: DEFAULT_PROVIDER,
          model: defaultModel(),
          max_tokens: REVEAL_MAX_TOKENS,
          temperature: 0.9,
          messages,
        }),
      });
      if (!res.ok) throw new Error(`reveal request failed: ${res.status}`);
      const data = await res.json();
      const text: string = data?.content?.[0]?.text ?? "";
      const parsed = parseReveal(text, framing);
      if (!parsed.ok) {
        // One corrective retry.
        const retryMessages: Message[] = [
          ...messages,
          { role: "assistant", content: text },
          { role: "user", content: "Your previous response was not valid JSON. Return only the JSON object, no other text, no code fences." },
        ];
        const retry = await fetch(API_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: DEFAULT_PROVIDER,
            model: defaultModel(),
            max_tokens: REVEAL_MAX_TOKENS,
            temperature: 0.7,
            messages: retryMessages,
          }),
        });
        if (!retry.ok) throw new Error("reveal retry failed");
        const retryData = await retry.json();
        const retryText: string = retryData?.content?.[0]?.text ?? "";
        const retryParsed = parseReveal(retryText, framing);
        if (!retryParsed.ok) throw new Error(`reveal parse failed: ${retryParsed.errors.join(", ")}`);
        finalizeReveal(retryParsed.character);
        return;
      }
      finalizeReveal(parsed.character);
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }

    function finalizeReveal(character: Parameters<typeof saveAdventure>[0]["character"]) {
      const newState: AdventureState = {
        character,
        scenes: [],
        ended: false,
        endedBy: null,
        startedAt: new Date().toISOString(),
      };
      setState(newState);
      setPhase("reveal-shown");
    }
  }, []);

  const generateScene = useCallback(
    async (currentState: AdventureState, fromChoice: string) => {
      const sceneNumber = currentState.scenes.length + 1;
      const prompt = buildScenePrompt(currentState, sceneNumber, fromChoice, language);
      const messages: Message[] = [{ role: "user", content: prompt }];

      setPhase("scene-generating");
      setStreamingText("");

      try {
        const res = await fetch(STREAMING_API_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: DEFAULT_PROVIDER,
            model: defaultModel(),
            max_tokens: SCENE_MAX_TOKENS,
            temperature: 1.0,
            stream: true,
            messages,
          }),
        });
        if (!res.ok || !res.body) throw new Error(`scene request failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta: string = parsed?.delta ?? parsed?.content ?? "";
              if (delta) {
                raw += delta;
                const partial = parseSceneStream(raw);
                setStreamingText(partial.text);
              }
            } catch {
              // Ignore malformed SSE payloads.
            }
          }
        }

        const final = parseSceneStream(raw);
        const closingForced = sceneNumber >= MAX_SCENES;
        const closing = closingForced || final.closing;
        const newScene: Scene = {
          sceneNumber,
          text: final.text,
          choices: closing ? [] : final.choices,
          closing,
          summary: final.summary || final.text.slice(0, 120),
          fromChoice,
        };
        const newState: AdventureState = {
          ...currentState,
          scenes: [...currentState.scenes, newScene],
          ended: closing,
          endedBy: closing ? "model" : null,
        };
        setState(newState);
        setStreamingText("");
        setPhase(closing ? "ended" : "scene-shown");
      } catch (e) {
        setError((e as Error).message);
        setPhase("scene-shown");
      }
    },
    [language]
  );

  const advanceFromReveal = useCallback(async () => {
    if (!state) return;
    await generateScene(state, "");
  }, [state, generateScene]);

  const pickChoice = useCallback(
    async (choice: string) => {
      if (!state) return;
      await generateScene(state, choice);
    },
    [state, generateScene]
  );

  const stopHere = useCallback(() => {
    if (!state) return;
    const ended: AdventureState = { ...state, ended: true, endedBy: "user" };
    setState(ended);
    setPhase("ended");
  }, [state]);

  const resetAdventure = useCallback(() => {
    clearAdventure();
    setState(null);
    setStreamingText("");
    setError(null);
    setPhase("idle");
  }, []);

  const resumeAdventure = useCallback((): boolean => {
    const saved = loadAdventure();
    if (!saved) return false;
    setState(saved);
    setPhase(saved.ended ? "ended" : "scene-shown");
    return true;
  }, []);

  return {
    phase,
    state,
    error,
    streamingText,
    beginAdventure,
    advanceFromReveal,
    pickChoice,
    stopHere,
    resetAdventure,
    resumeAdventure,
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/useAdventure.test.tsx`
Expected: PASS, 5 cases.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdventure.ts test/teyvat/useAdventure.test.tsx
git commit -m "$(cat <<'EOF'
add useAdventure hook driving the Teyvat state machine

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Replace i18n strings with the Teyvat-flavored set

**Files:**
- Modify: `i18n/index.tsx`

The file's structure (provider, hook, translations object) stays. Only the string contents change.

- [ ] **Step 1: Read the existing file's structure**

Run: `wc -l i18n/index.tsx` and skim the existing file in your editor — preserve everything outside the `translations` object.

- [ ] **Step 2: Replace the `translations` object with the Teyvat strings**

In `i18n/index.tsx`, replace the entire `translations` object literal with:

```tsx
const translations: Record<string, Record<string, string>> = {
  en: {
    app_title: "Drift",
    app_tagline: "A short adventure in Teyvat, written for you.",
    begin: "Begin",
    walk_into_world: "Walk into the world →",
    listening_for_name: "Listening for your name…",
    the_path_responds: "The path responds…",
    stop_here: "stop here",
    chapter_mood: "Mood",
    chapter_mood_subtitle: "Where you are inside yourself, right now.",
    chapter_desire: "Desire",
    chapter_desire_subtitle: "What you're actually reaching for.",
    chapter_conflict: "Conflict",
    chapter_conflict_subtitle: "How you move when the path forks.",
    next: "Next",
    back: "Back",
    vision_acquisition_header: "The day your Vision answered.",
    travel_with: "You travel with",
    scene_label: "Scene",
    see_earlier: "↺ See earlier scenes",
    ending_model: "Their story ends here.",
    ending_user: "Their story pauses here.",
    read_again: "Read it again from the start",
    walk_different: "Walk a different path",
    resume_prompt: "An adventure is paused. Resume?",
    resume: "Resume",
    start_over: "Start over",
    error_generic: "Something went wrong. Try again.",
    quota_low: "adventures left today",
    settings: "Settings",
    language: "Language",
  },
  zh: {
    app_title: "漂",
    app_tagline: "为你写的,提瓦特里的一段短行旅。",
    begin: "出发",
    walk_into_world: "走入这个世界 →",
    listening_for_name: "在听你的名字……",
    the_path_responds: "路在回应……",
    stop_here: "在此停下",
    chapter_mood: "心境",
    chapter_mood_subtitle: "此刻你在自己内部的什么位置。",
    chapter_desire: "欲望",
    chapter_desire_subtitle: "你真正在伸手够的东西。",
    chapter_conflict: "冲突",
    chapter_conflict_subtitle: "路口出现时,你怎么走。",
    next: "下一个",
    back: "返回",
    vision_acquisition_header: "神之眼回应你的那一天。",
    travel_with: "你与之同行的是",
    scene_label: "第",
    see_earlier: "↺ 回看之前的场景",
    ending_model: "他们的故事在此结束。",
    ending_user: "他们的故事在此停下。",
    read_again: "从头再读一遍",
    walk_different: "走另一条路",
    resume_prompt: "有一段旅程暂停了。要继续吗?",
    resume: "继续",
    start_over: "重来",
    error_generic: "出了点问题。再试一次。",
    quota_low: "今天还剩",
    settings: "设置",
    language: "语言",
  },
};
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS. (Some old components may still reference old i18n keys; those components are deleted in Task 17. If any of them now break the type check, leave them — Task 17 removes them and the next type-check pass will be clean. If the build script needs them clean before Task 17, add a temporary `// @ts-expect-error` to the offending lines and remove them in Task 17.)

- [ ] **Step 4: Commit**

```bash
git add i18n/index.tsx
git commit -m "$(cat <<'EOF'
replace i18n strings with Teyvat adventure copy (en/zh)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Build the Title screen component

**Files:**
- Create: `components/teyvat/TitleScreen.tsx`

(No standalone test — covered by the page-level integration in Task 16. Components are minimal presentational shells.)

- [ ] **Step 1: Implement**

```tsx
// components/teyvat/TitleScreen.tsx
"use client";

import { useI18n } from "@/i18n";
import { FONT_DISPLAY, INK, INK_SOFT } from "@/lib/teyvat/theme";

interface Props {
  onBegin: () => void;
  onResume?: () => void;
  hasSavedAdventure?: boolean;
}

export function TitleScreen({ onBegin, onResume, hasSavedAdventure }: Props) {
  const { t } = useI18n();
  return (
    <div style={wrap}>
      <h1 style={titleStyle}>{t("app_title")}</h1>
      <p style={taglineStyle}>{t("app_tagline")}</p>
      <button type="button" style={primaryBtn} onClick={onBegin}>
        {t("begin")}
      </button>
      {hasSavedAdventure && onResume && (
        <button type="button" style={secondaryBtn} onClick={onResume}>
          {t("resume")}
        </button>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  padding: 24,
};

const titleStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 96,
  letterSpacing: "0.02em",
  color: INK,
  fontWeight: 500,
};

const taglineStyle: React.CSSProperties = {
  fontSize: 16,
  color: INK_SOFT,
  fontStyle: "italic",
  maxWidth: 420,
  textAlign: "center",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 16,
  padding: "14px 36px",
  fontSize: 16,
  background: INK,
  color: "#f5ecd9",
  border: "none",
  borderRadius: 2,
  letterSpacing: "0.05em",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  fontSize: 14,
  background: "transparent",
  color: INK_SOFT,
  border: `1px solid rgba(31,27,21,0.16)`,
  borderRadius: 2,
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/teyvat/TitleScreen.tsx
git commit -m "$(cat <<'EOF'
add TitleScreen with begin and optional resume

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Build the Questionnaire component

**Files:**
- Create: `components/teyvat/Questionnaire.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/teyvat/Questionnaire.tsx
"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import {
  TEYVAT_STEPS,
  CHAPTER_META,
  type TeyvatAnswers,
  type ChapterKey,
} from "@/lib/teyvat/questionnaire";
import { FONT_DISPLAY, INK, INK_SOFT, INK_FAINT, BORDER_FAINT, BORDER_SOFT } from "@/lib/teyvat/theme";

interface Props {
  onComplete: (answers: TeyvatAnswers) => void;
}

export function Questionnaire({ onComplete }: Props) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TeyvatAnswers>({});

  const step = TEYVAT_STEPS[index];
  const isLast = index === TEYVAT_STEPS.length - 1;
  const showChapterIntro = useMemo(() => {
    if (index === 0) return true;
    return TEYVAT_STEPS[index - 1].chapter !== step.chapter;
  }, [index, step.chapter]);

  const choose = (value: string) => {
    setAnswers((a) => ({ ...a, [step.id]: value }));
  };

  const advance = () => {
    if (isLast) {
      onComplete(answers);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const chosen = answers[step.id];
  const chapter: ChapterKey = step.chapter;

  return (
    <div style={wrap}>
      <div style={progress}>
        {TEYVAT_STEPS.map((_, i) => (
          <span key={i} style={{ ...dot, opacity: i === index ? 1 : 0.3 }} />
        ))}
      </div>

      {showChapterIntro && (
        <div style={chapterBlock}>
          <h2 style={chapterTitleStyle}>{CHAPTER_META[chapter].title[lang]}</h2>
          <p style={chapterSubStyle}>{CHAPTER_META[chapter].subtitle[lang]}</p>
        </div>
      )}

      <h3 style={questionStyle}>{step.title[lang]}</h3>

      <div style={optionsWrap}>
        {step.options.map((opt) => {
          const selected = chosen === opt.value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.value)}
              style={{
                ...optionBtn,
                borderColor: selected ? INK : BORDER_SOFT,
                background: selected ? "rgba(31,27,21,0.04)" : "transparent",
              }}
            >
              {opt.label[lang]}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={advance}
        disabled={!chosen}
        style={{
          ...nextBtn,
          opacity: chosen ? 1 : 0.4,
        }}
      >
        {isLast ? t("begin") : t("next")}
      </button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "48px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const progress: React.CSSProperties = {
  display: "flex",
  gap: 6,
  justifyContent: "center",
};

const dot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: INK,
};

const chapterBlock: React.CSSProperties = {
  textAlign: "center",
  marginTop: 16,
};

const chapterTitleStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 36,
  fontStyle: "italic",
  color: INK,
};

const chapterSubStyle: React.CSSProperties = {
  marginTop: 8,
  color: INK_FAINT,
  fontSize: 14,
};

const questionStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 24,
  color: INK,
  textAlign: "center",
  margin: "16px 0",
};

const optionsWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const optionBtn: React.CSSProperties = {
  padding: "16px 18px",
  textAlign: "left",
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: 4,
  background: "transparent",
  color: INK_SOFT,
  fontSize: 15,
  lineHeight: 1.5,
};

const nextBtn: React.CSSProperties = {
  alignSelf: "center",
  marginTop: 16,
  padding: "12px 32px",
  background: INK,
  color: "#f5ecd9",
  border: "none",
  borderRadius: 2,
  fontSize: 14,
  letterSpacing: "0.05em",
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/teyvat/Questionnaire.tsx
git commit -m "$(cat <<'EOF'
add staged Questionnaire component for the Teyvat flow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Build the RevealCard component

**Files:**
- Create: `components/teyvat/RevealCard.tsx`
- Create: `test/teyvat/RevealCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// test/teyvat/RevealCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevealCard } from "@/components/teyvat/RevealCard";
import { I18nProvider } from "@/i18n";
import type { RevealedCharacter } from "@/lib/teyvat/character";

const CHARACTER: RevealedCharacter = {
  framing: "companion",
  name: "Yuna",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads.",
  visionStory: "She was sketching the cliffs at Yashiori when the wave came.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "Wanderer — they share a quiet contempt for fate",
};

describe("RevealCard", () => {
  it("renders the core fields", () => {
    render(
      <I18nProvider>
        <RevealCard character={CHARACTER} onAdvance={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText("Yuna")).toBeInTheDocument();
    expect(screen.getByText(/Cryo/)).toBeInTheDocument();
    expect(screen.getByText(/Inazuma/)).toBeInTheDocument();
    expect(screen.getByText(/polearm/)).toBeInTheDocument();
    expect(screen.getByText(/Wandering Cartographer/)).toBeInTheDocument();
    expect(screen.getByText(/She was sketching/)).toBeInTheDocument();
    expect(screen.getByText(/Lantern of Quiet Hours/)).toBeInTheDocument();
  });

  it("shows companion line when framing is companion", () => {
    render(
      <I18nProvider>
        <RevealCard character={CHARACTER} onAdvance={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText(/Wanderer/)).toBeInTheDocument();
  });

  it("hides companion line when framing is protagonist", () => {
    render(
      <I18nProvider>
        <RevealCard
          character={{ ...CHARACTER, framing: "protagonist", knownAssociate: "" }}
          onAdvance={() => {}}
        />
      </I18nProvider>
    );
    expect(screen.queryByText(/Wanderer/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/RevealCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `components/teyvat/RevealCard.tsx`**

```tsx
// components/teyvat/RevealCard.tsx
"use client";

import { useI18n } from "@/i18n";
import { themeForVision, FONT_DISPLAY, INK, INK_SOFT, INK_FAINT, BORDER_SOFT } from "@/lib/teyvat/theme";
import type { RevealedCharacter } from "@/lib/teyvat/character";

interface Props {
  character: RevealedCharacter;
  onAdvance: () => void;
}

export function RevealCard({ character, onAdvance }: Props) {
  const { t } = useI18n();
  const palette = themeForVision(character.vision);

  return (
    <div style={wrap}>
      <article
        style={{
          ...card,
          borderColor: palette.accent,
          boxShadow: `0 1px 0 ${BORDER_SOFT}, 0 0 0 4px ${palette.tint}`,
        }}
      >
        <h1 style={{ ...nameStyle, color: palette.emphasis }}>{character.name}</h1>
        <p style={metaLine}>
          {character.vision} · {character.nation} · {character.weapon}
        </p>
        <p style={archetypeStyle}>{character.archetype}</p>

        <p style={bioStyle}>{character.bio}</p>

        <div style={divider} />

        <h2 style={visionHeader}>{t("vision_acquisition_header")}</h2>
        <p style={visionStory}>{character.visionStory}</p>

        <div style={divider} />

        <p style={constellationStyle}>{character.constellation}</p>
        <p style={signatureStyle}>{character.signature}</p>

        {character.framing === "companion" && character.knownAssociate && (
          <p style={associateStyle}>
            {t("travel_with")}: <span style={{ color: palette.emphasis }}>{character.knownAssociate}</span>
          </p>
        )}

        <button type="button" onClick={onAdvance} style={{ ...advanceBtn, background: INK }}>
          {t("walk_into_world")}
        </button>
      </article>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card: React.CSSProperties = {
  maxWidth: 600,
  width: "100%",
  padding: "40px 32px",
  background: "rgba(255,250,240,0.7)",
  border: `1px solid`,
  borderRadius: 4,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  textAlign: "center",
};

const nameStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 56,
  fontWeight: 500,
  letterSpacing: "0.02em",
};

const metaLine: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: INK_FAINT,
  marginTop: 4,
};

const archetypeStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 18,
  fontStyle: "italic",
  color: INK_SOFT,
};

const bioStyle: React.CSSProperties = {
  marginTop: 16,
  fontSize: 15,
  lineHeight: 1.7,
  color: INK_SOFT,
};

const divider: React.CSSProperties = {
  height: 1,
  background: BORDER_SOFT,
  margin: "16px 0",
};

const visionHeader: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 16,
  fontStyle: "italic",
  color: INK,
};

const visionStory: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: INK_SOFT,
  fontStyle: "italic",
};

const constellationStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 18,
  color: INK,
  letterSpacing: "0.04em",
};

const signatureStyle: React.CSSProperties = {
  fontSize: 13,
  color: INK_FAINT,
  fontStyle: "italic",
};

const associateStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: INK_FAINT,
};

const advanceBtn: React.CSSProperties = {
  marginTop: 24,
  padding: "12px 28px",
  color: "#f5ecd9",
  border: "none",
  borderRadius: 2,
  fontSize: 14,
  letterSpacing: "0.05em",
  alignSelf: "center",
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run test/teyvat/RevealCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/teyvat/RevealCard.tsx test/teyvat/RevealCard.test.tsx
git commit -m "$(cat <<'EOF'
add RevealCard with character details and Vision-acquisition vignette

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Build SceneView and AdventureLog components

**Files:**
- Create: `components/teyvat/SceneView.tsx`
- Create: `components/teyvat/AdventureLog.tsx`
- Create: `test/teyvat/SceneView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// test/teyvat/SceneView.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SceneView } from "@/components/teyvat/SceneView";
import { I18nProvider } from "@/i18n";
import type { Scene } from "@/lib/teyvat/scenes";

const SCENE: Scene = {
  sceneNumber: 1,
  text: "She crossed the threshold.",
  choices: ["follow the voice", "stay where you are", "turn back into the rain"],
  closing: false,
  summary: "Yuna crossed the gate.",
  fromChoice: "",
};

describe("SceneView", () => {
  it("renders scene text and choices when not streaming", async () => {
    const onPick = vi.fn();
    const onStop = vi.fn();
    render(
      <I18nProvider>
        <SceneView scene={SCENE} streaming={false} streamingText="" accent="#9bc8d4" onPickChoice={onPick} onStop={onStop} />
      </I18nProvider>
    );
    expect(screen.getByText("She crossed the threshold.")).toBeInTheDocument();
    for (const c of SCENE.choices) expect(screen.getByText(c)).toBeInTheDocument();
    expect(screen.getByText(/stop here/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText("follow the voice"));
    expect(onPick).toHaveBeenCalledWith("follow the voice");

    await userEvent.click(screen.getByText(/stop here/i));
    expect(onStop).toHaveBeenCalled();
  });

  it("renders streaming text and hides choices while streaming", () => {
    render(
      <I18nProvider>
        <SceneView scene={null} streaming={true} streamingText="She crossed" accent="#9bc8d4" onPickChoice={() => {}} onStop={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText("She crossed")).toBeInTheDocument();
    expect(screen.queryByText(/stop here/i)).toBeNull();
  });

  it("hides choices when scene.closing is true", () => {
    render(
      <I18nProvider>
        <SceneView
          scene={{ ...SCENE, closing: true, choices: [] }}
          streaming={false}
          streamingText=""
          accent="#9bc8d4"
          onPickChoice={() => {}}
          onStop={() => {}}
        />
      </I18nProvider>
    );
    expect(screen.queryByText("follow the voice")).toBeNull();
    expect(screen.queryByText(/stop here/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run test/teyvat/SceneView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `components/teyvat/SceneView.tsx`**

```tsx
// components/teyvat/SceneView.tsx
"use client";

import { useI18n } from "@/i18n";
import { FONT_DISPLAY, INK, INK_SOFT, INK_FAINT, BORDER_SOFT } from "@/lib/teyvat/theme";
import type { Scene } from "@/lib/teyvat/scenes";

interface Props {
  scene: Scene | null;
  streaming: boolean;
  streamingText: string;
  accent: string;
  onPickChoice: (choice: string) => void;
  onStop: () => void;
  onOpenLog?: () => void;
}

export function SceneView({ scene, streaming, streamingText, accent, onPickChoice, onStop, onOpenLog }: Props) {
  const { t } = useI18n();
  const text = streaming ? streamingText : scene?.text ?? "";
  const showChoices = !streaming && scene && !scene.closing && scene.choices.length > 0;

  return (
    <div style={wrap}>
      <div style={topBar}>
        {scene && (
          <span style={sceneLabel}>
            {t("scene_label")} {scene.sceneNumber}
          </span>
        )}
        {onOpenLog && scene && scene.sceneNumber > 1 && (
          <button type="button" style={logToggle} onClick={onOpenLog}>
            {t("see_earlier")}
          </button>
        )}
      </div>

      <article style={prose}>
        {text.split(/\n\n+/).map((para, i) => (
          <p key={i} style={paraStyle}>
            {para}
            {i === text.split(/\n\n+/).length - 1 && streaming ? <span style={{ ...cursorStyle, color: accent }}>▍</span> : null}
          </p>
        ))}
      </article>

      {showChoices && scene && (
        <div style={choicesWrap}>
          {scene.choices.map((c) => (
            <button key={c} type="button" onClick={() => onPickChoice(c)} style={{ ...choiceBtn, borderColor: accent }}>
              {c}
            </button>
          ))}
          <button type="button" onClick={onStop} style={stopBtn}>
            {t("stop_here")}
          </button>
        </div>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 12,
  color: INK_FAINT,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const sceneLabel: React.CSSProperties = { fontFamily: FONT_DISPLAY, fontStyle: "italic" };

const logToggle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: INK_FAINT,
  fontSize: 12,
  cursor: "pointer",
};

const prose: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 19,
  lineHeight: 1.7,
  color: INK,
};

const paraStyle: React.CSSProperties = {
  margin: "0 0 1em 0",
};

const cursorStyle: React.CSSProperties = {
  marginLeft: 4,
  animation: "blink 1s step-end infinite",
};

const choicesWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 16,
};

const choiceBtn: React.CSSProperties = {
  padding: "14px 18px",
  background: "transparent",
  border: "1px solid",
  borderRadius: 4,
  fontSize: 15,
  color: INK_SOFT,
  textAlign: "left",
  cursor: "pointer",
};

const stopBtn: React.CSSProperties = {
  marginTop: 12,
  padding: "8px 14px",
  background: "transparent",
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: 4,
  fontSize: 12,
  color: INK_FAINT,
  alignSelf: "center",
  cursor: "pointer",
  letterSpacing: "0.05em",
};
```

- [ ] **Step 4: Implement `components/teyvat/AdventureLog.tsx`**

```tsx
// components/teyvat/AdventureLog.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { FONT_DISPLAY, INK, INK_SOFT, INK_FAINT, BORDER_SOFT } from "@/lib/teyvat/theme";
import type { Scene } from "@/lib/teyvat/scenes";

interface Props {
  scenes: Scene[];
  onClose: () => void;
}

export function AdventureLog({ scenes, onClose }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <aside style={panel}>
      <button type="button" onClick={onClose} style={closeBtn}>×</button>
      <h3 style={header}>{t("see_earlier")}</h3>
      <ol style={list}>
        {scenes.map((s) => (
          <li key={s.sceneNumber} style={item}>
            <button
              type="button"
              onClick={() => setExpanded((e) => (e === s.sceneNumber ? null : s.sceneNumber))}
              style={itemBtn}
            >
              <span style={itemHead}>
                {t("scene_label")} {s.sceneNumber} · <span style={{ color: INK_FAINT }}>{s.summary}</span>
              </span>
              {s.fromChoice && <span style={fromChoice}>↪ "{s.fromChoice}"</span>}
            </button>
            {expanded === s.sceneNumber && <div style={fullText}>{s.text}</div>}
          </li>
        ))}
      </ol>
    </aside>
  );
}

const panel: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: 360,
  maxWidth: "90vw",
  background: "#fbf3df",
  borderLeft: `1px solid ${BORDER_SOFT}`,
  padding: 24,
  overflowY: "auto",
  zIndex: 50,
  boxShadow: "-2px 0 20px rgba(31,27,21,0.05)",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 16,
  background: "transparent",
  border: "none",
  fontSize: 24,
  color: INK_SOFT,
  cursor: "pointer",
};

const header: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 20,
  color: INK,
  marginBottom: 16,
};

const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const item: React.CSSProperties = {
  borderBottom: `1px solid ${BORDER_SOFT}`,
  paddingBottom: 12,
};

const itemBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  textAlign: "left",
  width: "100%",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const itemHead: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 14,
  color: INK,
};

const fromChoice: React.CSSProperties = {
  fontSize: 12,
  color: INK_FAINT,
  fontStyle: "italic",
};

const fullText: React.CSSProperties = {
  marginTop: 12,
  fontFamily: FONT_DISPLAY,
  fontSize: 14,
  lineHeight: 1.6,
  color: INK_SOFT,
  whiteSpace: "pre-wrap",
};
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run test/teyvat/SceneView.test.tsx`
Expected: PASS, 3 cases.

- [ ] **Step 6: Commit**

```bash
git add components/teyvat/SceneView.tsx components/teyvat/AdventureLog.tsx test/teyvat/SceneView.test.tsx
git commit -m "$(cat <<'EOF'
add SceneView and AdventureLog components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Build the Ending screen

**Files:**
- Create: `components/teyvat/Ending.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/teyvat/Ending.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { FONT_DISPLAY, INK, INK_SOFT, INK_FAINT, BORDER_SOFT, themeForVision } from "@/lib/teyvat/theme";
import { AdventureLog } from "@/components/teyvat/AdventureLog";
import type { AdventureState } from "@/lib/teyvat/scenes";

interface Props {
  state: AdventureState;
  onNewRun: () => void;
}

export function Ending({ state, onNewRun }: Props) {
  const { t } = useI18n();
  const [logOpen, setLogOpen] = useState(false);
  const palette = themeForVision(state.character.vision);
  const endingText = state.endedBy === "user" ? t("ending_user") : t("ending_model");

  return (
    <div style={wrap}>
      <h1 style={{ ...nameStyle, color: palette.emphasis }}>{state.character.name}</h1>
      <p style={meta}>{state.character.vision} · {state.character.nation}</p>
      <p style={endingLine}>{endingText}</p>
      <div style={btnRow}>
        <button type="button" onClick={() => setLogOpen(true)} style={primaryBtn}>{t("read_again")}</button>
        <button type="button" onClick={onNewRun} style={secondaryBtn}>{t("walk_different")}</button>
      </div>
      {logOpen && <AdventureLog scenes={state.scenes} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 24,
};

const nameStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 64,
  fontWeight: 500,
};

const meta: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: INK_FAINT,
};

const endingLine: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 18,
  fontStyle: "italic",
  color: INK_SOFT,
  marginTop: 16,
};

const btnRow: React.CSSProperties = {
  marginTop: 24,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  justifyContent: "center",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 24px",
  background: INK,
  color: "#f5ecd9",
  border: "none",
  borderRadius: 2,
  fontSize: 14,
  letterSpacing: "0.05em",
};

const secondaryBtn: React.CSSProperties = {
  padding: "12px 24px",
  background: "transparent",
  color: INK_SOFT,
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: 2,
  fontSize: 14,
  letterSpacing: "0.05em",
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/teyvat/Ending.tsx
git commit -m "$(cat <<'EOF'
add Ending screen with re-read and new-run actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Replace `app/page.tsx` with the Teyvat flow

**Files:**
- Modify: `app/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `app/page.tsx`**

Overwrite the file:

```tsx
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useAdventure } from "@/hooks/useAdventure";
import { TitleScreen } from "@/components/teyvat/TitleScreen";
import { Questionnaire } from "@/components/teyvat/Questionnaire";
import { RevealCard } from "@/components/teyvat/RevealCard";
import { SceneView } from "@/components/teyvat/SceneView";
import { Ending } from "@/components/teyvat/Ending";
import { AdventureLog } from "@/components/teyvat/AdventureLog";
import { themeForVision, INK_FAINT, FONT_DISPLAY } from "@/lib/teyvat/theme";
import { loadAdventure } from "@/lib/teyvat/storage";

export default function Page() {
  const { t, lang } = useI18n();
  const adv = useAdventure();
  const [stage, setStage] = useState<"title" | "questionnaire">("title");
  const [logOpen, setLogOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    setHasSaved(loadAdventure() !== null);
  }, []);

  if (adv.phase === "idle" && stage === "title") {
    return (
      <TitleScreen
        onBegin={() => setStage("questionnaire")}
        onResume={hasSaved ? () => adv.resumeAdventure() : undefined}
        hasSavedAdventure={hasSaved}
      />
    );
  }

  if (adv.phase === "idle" && stage === "questionnaire") {
    return <Questionnaire onComplete={(answers) => adv.beginAdventure(answers, lang)} />;
  }

  if (adv.phase === "revealing") {
    return (
      <main style={loadingWrap}>
        <p style={loadingText}>{t("listening_for_name")}</p>
      </main>
    );
  }

  if (adv.phase === "reveal-shown" && adv.state) {
    return <RevealCard character={adv.state.character} onAdvance={() => adv.advanceFromReveal()} />;
  }

  if ((adv.phase === "scene-generating" || adv.phase === "scene-shown") && adv.state) {
    const accent = themeForVision(adv.state.character.vision).accent;
    const lastScene = adv.state.scenes[adv.state.scenes.length - 1] ?? null;
    return (
      <>
        <SceneView
          scene={adv.phase === "scene-generating" ? null : lastScene}
          streaming={adv.phase === "scene-generating"}
          streamingText={adv.streamingText}
          accent={accent}
          onPickChoice={(choice) => adv.pickChoice(choice)}
          onStop={() => adv.stopHere()}
          onOpenLog={() => setLogOpen(true)}
        />
        {logOpen && <AdventureLog scenes={adv.state.scenes} onClose={() => setLogOpen(false)} />}
      </>
    );
  }

  if (adv.phase === "ended" && adv.state) {
    return (
      <Ending
        state={adv.state}
        onNewRun={() => {
          adv.resetAdventure();
          setStage("title");
        }}
      />
    );
  }

  return (
    <main style={loadingWrap}>
      <p style={loadingText}>{adv.error ?? "…"}</p>
    </main>
  );
}

const loadingWrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const loadingText: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontStyle: "italic",
  color: INK_FAINT,
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: A wave of errors from old components / hooks the page no longer uses but TypeScript still type-checks. They will all be removed in Task 17. If type-check pressure is unacceptable here, run `npx tsc --noEmit` only on `app/page.tsx`'s direct imports, or proceed to Task 17 immediately and re-check after.

For this commit, type-check only the new files:

Run: `npx tsc --noEmit -p tsconfig.json` and expect failures from old files. **Do not commit if there are errors in any file we are NOT about to delete in Task 17.** If errors exist only in soon-to-be-deleted files, proceed.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
replace page.tsx with Teyvat adventure flow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Remove dead code from the destiny app

This deletes everything no longer reachable. After this task, type-check and lint should be fully clean.

**Files to delete:**
- `components/Big5Form.tsx`, `components/BulletField.tsx`, `components/AmmoHUD.tsx`, `components/CartridgeIcon.tsx`, `components/CatchBurst.tsx`, `components/FireImpact.tsx`, `components/InputForm.tsx`, `components/StepIndicator.tsx`, `components/StoryRating.tsx`, `components/TrajectoryCard.tsx`, `components/WorkflowRail.tsx`
- `hooks/useGeneration.ts`
- `lib/prompts.ts`, `lib/questionnaire.ts`, `lib/revolver.ts`, `lib/styles.ts`, `lib/motion.ts`, `lib/devPreview.ts`, `lib/theme.ts`
- `test/AmmoHUD.test.tsx`, `test/BulletField.test.tsx`, `test/FireImpact.test.tsx`, `test/questionnaire.test.ts`, `test/prompts.test.ts`, `test/revolver.test.ts`, `test/useGeneration.test.tsx`

**Files to modify:**
- `lib/constants.ts` — remove `BIG5_KEYS`, `NOISE_SCAN_COUNT`, `QUALITY_GATE_THRESHOLD`, `MAX_EXTRA_SHARPEN_PASSES`, `STORY_STYLES` block, `DEFAULT_STORY_STYLE`, `STORY_STYLE_STORAGE_KEY`, `StoryStyle` type, `StoryStyleDef`.
- `types/index.ts` — remove `NoiseFragment`, `Bullet`, `BulletStatus`, `REVOLVER_CHAMBERS`, `MAX_BULLET_PASSES`, `Fields`, `AgeGroup`, `CurationAnswers`, `StoryConditioning`, `RunPhase`, `WorkflowStage`, `QuestionnaireAnswers`. Keep `Message`, `LLMRequest`, `AnthropicResponse`, `DailyQuota`, `Language`, `StreamingLLMRequest`.

- [ ] **Step 1: Delete components**

```bash
rm components/Big5Form.tsx components/BulletField.tsx components/AmmoHUD.tsx components/CartridgeIcon.tsx components/CatchBurst.tsx components/FireImpact.tsx components/InputForm.tsx components/StepIndicator.tsx components/StoryRating.tsx components/TrajectoryCard.tsx components/WorkflowRail.tsx
```

- [ ] **Step 2: Delete hook + libs**

```bash
rm hooks/useGeneration.ts lib/prompts.ts lib/questionnaire.ts lib/revolver.ts lib/styles.ts lib/motion.ts lib/devPreview.ts lib/theme.ts
```

- [ ] **Step 3: Delete old tests**

```bash
rm test/AmmoHUD.test.tsx test/BulletField.test.tsx test/FireImpact.test.tsx test/questionnaire.test.ts test/prompts.test.ts test/revolver.test.ts test/useGeneration.test.tsx
```

- [ ] **Step 4: Trim `lib/constants.ts`**

Open `lib/constants.ts`. Keep these declarations:

- `DEFAULT_PROVIDER`, `PROVIDERS`
- `DAILY_USAGE_STORAGE_PREFIX`, `API_ROUTE`, `STREAMING_API_ROUTE`
- `FALLBACK_PROVIDERS`, `MAX_RETRIES`, `RETRY_BASE_DELAY_MS`
- `GEMINI_SEARCH_GROUNDING_DEFAULT`
- `ADVENTURE_STORAGE_KEY`, `MAX_SCENES`, `REVEAL_MAX_TOKENS`, `SCENE_MAX_TOKENS` (added in Task 6)

Delete: `BIG5_KEYS`, `NOISE_SCAN_COUNT`, `QUALITY_GATE_THRESHOLD`, `MAX_EXTRA_SHARPEN_PASSES`, `StoryStyle`, `StoryStyleDef`, `STORY_STYLES`, `DEFAULT_STORY_STYLE`, `STORY_STYLE_STORAGE_KEY`.

- [ ] **Step 5: Trim `types/index.ts`**

Open `types/index.ts`. Replace its contents with:

```ts
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  provider: string;
  model: string;
  max_tokens: number;
  temperature: number;
  messages: Message[];
}

export interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

export interface DailyQuota {
  limit: number;
  remaining: number;
}

export type Language = "en" | "zh";

export interface StreamingLLMRequest extends LLMRequest {
  stream?: boolean;
}
```

- [ ] **Step 6: Type check + tests + lint**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: ALL PASS. If any error remains, it's because the API routes (`app/api/generate/route.ts`, `app/api/telemetry/route.ts`) imported something we removed from constants/types. Inspect the imports:

```bash
grep -rn "STORY_STYLE\|BIG5_KEYS\|NOISE_SCAN_COUNT\|StoryConditioning\|RunPhase\|recordLlmCall" app/api lib/telemetry.ts
```

Fix any direct imports by either removing the unused import or stubbing the value (the API routes should not depend on prompt/story-style logic — that was client-only). If `lib/telemetry.ts` references types from the deleted set, prune those references.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
remove destiny-era components, hooks, prompts, and tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Update README and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

These docs currently describe the destiny app. Both must reflect the Teyvat flow.

- [ ] **Step 1: Read current README.md**

Run: `wc -l README.md`. Skim it to identify the product overview, the setup section, the env vars section, and the runtime-flow section.

- [ ] **Step 2: Rewrite the product overview, runtime flow, and "Key Files" sections of README.md**

Replace the **product overview** with: the app is an interactive Teyvat (Genshin Impact) adventure. A short vague questionnaire seeds a randomized character (Vision, nation, weapon, archetype, Vision-acquisition vignette, constellation), then the user navigates an open-ended scene-by-scene quest by picking vague evocative choices.

Replace the **runtime flow** section with: questionnaire → reveal (single non-streamed JSON call) → scene loop (streamed scenes with tag-delimited prose / choices / closing / summary) → ending. Mention the soft pacing matrix and the hard cap at scene 10.

Update **environment variables**: keep all existing provider keys and Supabase / Upstash variables — the runtime engine still needs them.

Update **Key Files** to point to:
- `app/page.tsx`
- `app/api/generate/route.ts` and `app/api/generate/stream/route.ts`
- `hooks/useAdventure.ts`
- `lib/teyvat/questionnaire.ts`
- `lib/teyvat/prompts.ts`
- `lib/teyvat/character.ts`
- `lib/teyvat/scenes.ts`
- `lib/teyvat/storage.ts`
- `lib/teyvat/elements.ts`
- `lib/teyvat/theme.ts`
- `components/teyvat/TitleScreen.tsx`, `Questionnaire.tsx`, `RevealCard.tsx`, `SceneView.tsx`, `AdventureLog.tsx`, `Ending.tsx`
- `i18n/index.tsx`

Remove references to: revolver, bullets, noise scan, denoise loop, Big5, story styles, curation answers, `useGeneration`, `lib/prompts.ts`, `lib/questionnaire.ts`, `InputForm`, `Big5Form`, `TrajectoryCard`.

- [ ] **Step 3: Rewrite the relevant sections of CLAUDE.md**

Open `CLAUDE.md`. Replace the **Runtime Notes → Questionnaire Shape** section with:

> The questionnaire is the Teyvat reveal questionnaire. It lives in `lib/teyvat/questionnaire.ts` and `components/teyvat/Questionnaire.tsx`. Seven single-select questions across three chapters — Mood, Desire, Conflict. Answers are a `TeyvatAnswers` map (`stepId → option.value`) consumed by `buildRevealPrompt(...)`.

Replace the **Generation Flow** section with:

> `app/page.tsx` walks the user through Title → Questionnaire → Reveal → Scene loop → Ending. `hooks/useAdventure.ts` owns the runtime phases: `idle → questionnaire → revealing → reveal-shown → scene-generating → scene-shown → ended`.
>
> The reveal is a single non-streaming JSON call (`buildRevealPrompt` / `parseReveal`). One corrective retry on JSON parse failure. Framing (`protagonist` or `companion`) is rolled 50/50 per run.
>
> Each scene is a single streamed call (`buildScenePrompt` / `parseSceneStream`) using a tag-delimited format: `<scene>...</scene><choices>...</choices><closing>true|false</closing><summary>...</summary>`. The parser tolerates a missing `</scene>` close tag.
>
> Pacing matrix in `lib/teyvat/prompts.ts` escalates closing pressure from scene 1 to 7+. Hard cap at scene 10.

Replace the **Prompting** section to point at `lib/teyvat/prompts.ts` and its exports: `buildRevealPrompt`, `parseReveal`, `buildScenePrompt`, `parseSceneStream`.

Update the **Key Files** section the same way as the README's Key Files list.

Leave Providers/Quotas, Telemetry, and Working Style Notes mostly intact — they still apply.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "$(cat <<'EOF'
rewrite README and CLAUDE.md for the Teyvat adventure pivot

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Manual smoke test of the full flow

This is a manual verification task — no code, no commit. The agent runs the app and clicks through.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server boots on `http://localhost:3000`. Check the terminal for compilation errors.

- [ ] **Step 2: Set required env vars (if not already in `.env.local`)**

At minimum: `OPENROUTER_API_KEY` (or whichever provider is `DEFAULT_PROVIDER`). Telemetry and rate-limit env vars are optional — the app degrades gracefully.

- [ ] **Step 3: Walk through one adventure end-to-end**

Open the browser. Verify:
1. Title screen renders with parchment background and serif title.
2. Click Begin → questionnaire appears.
3. Answer all 7 questions; each chapter's intro appears at the right transitions.
4. Click Begin (last screen) → "Listening for your name…" loading appears.
5. Reveal card renders with all expected fields. Element accent color matches the rolled Vision.
6. Click "Walk into the world →" → scene 1 streams in. Cursor blinks at the leading edge.
7. After streaming completes, 3 choices and a "stop here" button appear.
8. Pick a choice → scene 2 begins streaming.
9. Open "↺ See earlier scenes" → log panel shows scene 1 summary.
10. Pick "stop here" mid-run → ending screen appears with "Their story pauses here."
11. Click "Walk a different path" → returns to title screen.

- [ ] **Step 4: Refresh-resume test**

Start a new adventure, get past scene 1, then refresh the page. Expected: title screen offers a Resume button. Click it; the last scene state is restored.

- [ ] **Step 5: Failure-mode quick check**

In dev tools, throttle the network or kill the API key briefly. Trigger a generation. Expected: an error message renders without crashing the app, and the user can retry by reloading.

- [ ] **Step 6: Stop the dev server**

`Ctrl+C` in the terminal.

If any of these fail, file a follow-up task before considering the plan done. Common issues likely to surface:
- The streaming SSE format from `app/api/generate/stream/route.ts` may not exactly match the `{delta: ...}` shape my hook expects. Inspect the route's actual SSE payload and adjust `useAdventure.ts`'s line `const delta: string = parsed?.delta ?? parsed?.content ?? "";` if needed.
- The reveal model may return Markdown despite "no code fences" — `parseReveal` strips ```json fences but if the model wraps in plain backticks or adds prose, the corrective retry should handle it.
- Element palette colors may need tuning if any combination looks washed out.

---

## Self-review

**Spec coverage check:**

- New flow (Title → Questionnaire → Reveal → Scene loop → Ending) — covered by Tasks 11–16.
- Drop Big5, revolver, denoise loop — covered by Task 17.
- 7 vague questions across 3 chapters — covered by Task 3.
- Random framing (protagonist / companion) rolled per run — covered in Task 9 (`rollFraming`).
- Reveal: structured JSON, non-streaming, one corrective retry — Task 4 + Task 9.
- Reveal card includes Vision-acquisition vignette and known associate — Task 13.
- Scene streaming with tag-delimited format — Tasks 5 + 9 + 14.
- Pacing matrix with escalating closure pressure — Task 5.
- "Stop here" button always available — Task 14.
- Hard cap at scene 10 — Task 9 (`closingForced`).
- localStorage persistence with resume — Tasks 6 + 9 + 16.
- Element-color theming — Tasks 1 + 7 + 13 + 14 + 15.
- Tolerant scene parser — Task 5.
- README + CLAUDE.md updates — Task 18.
- Manual smoke test — Task 19.

**Placeholder scan:** No "TBD", "fill in details", or vague error-handling instructions. Each step shows complete code or a precise edit to make.

**Type consistency:** `RevealedCharacter`, `Framing`, `AdventureState`, `Scene`, `TeyvatAnswers`, `AdventurePhase` — names match across all tasks.

**Open risks (intentionally accepted, surfaced to the executor):**
- The exact SSE payload shape from the streaming route is assumed; Task 19 step 6 calls this out and tells the executor to verify.
- Element palette colors are reasonable defaults; tuning is acceptable in a follow-up.
- The `"Drift"` app title is a placeholder — could be revisited in a separate naming pass.

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-05-teyvat-adventure.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?
