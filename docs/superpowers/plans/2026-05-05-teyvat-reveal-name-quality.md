# Teyvat Reveal: Name Quality + Title Field — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift reveal-card name quality by adding nation-specific naming conventions, banning element-words and canonical names, and introducing a `title` epithet field rendered with Genshin-style 「」 brackets.

**Architecture:** Single-pass JSON generation, same as today. Three layers carry the fix: (1) richer prompt that names the nation conventions and forbids element-in-name and canonical-character names; (2) a deterministic blocklist of canonical Genshin character names that `parseReveal` checks after schema validation, returning a parse error on collision; (3) a UI slot for the new `title` field directly under the name on the reveal card. The existing single corrective retry path in `useAdventure.ts` handles collisions by re-prompting with the specific error.

**Tech Stack:** TypeScript, Next.js 15, React 18, Vitest. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-05-teyvat-reveal-name-quality-design.md](../specs/2026-05-05-teyvat-reveal-name-quality-design.md)

---

## File Plan

**New:**
- `lib/teyvat/canonNames.ts` — canonical name list + `matchesCanonName(value)` matcher
- `test/teyvat/canonNames.test.ts` — matcher unit tests

**Modified:**
- `lib/teyvat/character.ts` — add `title` to `RevealedCharacter` interface and `validateRevealedCharacter`
- `lib/teyvat/prompts.ts` — three additions to `buildRevealPrompt` (nation conventions, naming constraints, title guidance + schema slot); collision check in `parseReveal`
- `hooks/useAdventure.ts` — surface parse errors into the corrective retry prompt
- `components/teyvat/RevealCard.tsx` — render `title` under name with language-conditional bracket treatment
- `test/teyvat/character.test.ts` — extend `VALID` fixture with `title`, add validation cases
- `test/teyvat/prompts.reveal.test.ts` — extend valid JSON fixture with `title`, add prompt-content and collision-detection cases
- `doc/architecture/repo-logic-and-prompt-flow.md` — note the title field, naming conventions, and canon collision check
- `doc/worklog/2026-05-05.md` — append entry
- `CLAUDE.md` — one-liner under "Prompting" about naming conventions and canon blocklist

---

## Task 1: Add `title` field to `RevealedCharacter` and validator

**Files:**
- Modify: `lib/teyvat/character.ts`
- Test: `test/teyvat/character.test.ts`

- [ ] **Step 1: Update existing test fixture and add new validation cases**

Edit `test/teyvat/character.test.ts`. The `VALID` constant currently has no `title`. Add it, then add a test that rejects an empty title. The full file should be:

```ts
import { describe, expect, it } from "vitest";
import {
  validateRevealedCharacter,
  type RevealedCharacter,
} from "@/lib/teyvat/character";

const VALID: RevealedCharacter = {
  framing: "protagonist",
  name: "Yuna",
  title: "The Quiet Cartographer",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads of Inazuma. Her maps have outlived three rulers. She owes no one a destination.",
  visionStory:
    "She was sketching the cliffs at Yashiori when the wave came. Holding the line of one stranger's pulse against the cold, she felt the ice answer, small and exact. The Vision settled into her palm before the storm broke.",
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
    const result = validateRevealedCharacter({
      ...VALID,
      framing: "companion",
      knownAssociate: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/knownAssociate/i);
    }
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

  it("rejects empty title", () => {
    const result = validateRevealedCharacter({ ...VALID, title: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /title/i.test(e))).toBe(true);
    }
  });

  it("rejects missing title", () => {
    const { title: _omitted, ...withoutTitle } = VALID;
    const result = validateRevealedCharacter(withoutTitle);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify the new cases fail and the existing ones may also fail**

Run: `npx vitest run test/teyvat/character.test.ts`
Expected: At minimum the two new `title` tests FAIL because `title` does not yet exist in the type or validator. The "accepts a fully-formed protagonist" test will also fail because `RevealedCharacter` does not yet have `title`, causing a TypeScript error.

- [ ] **Step 3: Add `title` to the interface and validator**

Edit `lib/teyvat/character.ts`. Add `title: string` to the interface (between `name` and `vision`) and add `"title"` to the non-empty-string field list in `validateRevealedCharacter`. The full file should be:

```ts
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
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validateRevealedCharacter(value: unknown): ValidationResult {
  if (typeof value !== "object" || value === null) {
    return { ok: false, errors: ["not an object"] };
  }

  const candidate = value as Record<string, unknown>;
  const errors: string[] = [];

  if (candidate.framing !== "protagonist" && candidate.framing !== "companion") {
    errors.push("framing must be 'protagonist' or 'companion'");
  }

  for (const field of [
    "name",
    "title",
    "archetype",
    "bio",
    "visionStory",
    "constellation",
    "signature",
  ] as const) {
    if (typeof candidate[field] !== "string" || (candidate[field] as string).trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (typeof candidate.vision !== "string" || !isVision(candidate.vision)) {
    errors.push("vision must be one of the seven Visions");
  }

  if (typeof candidate.nation !== "string" || !isNation(candidate.nation)) {
    errors.push('nation must be a known nation or "wandering"');
  }

  if (typeof candidate.weapon !== "string" || !isWeapon(candidate.weapon)) {
    errors.push("weapon must be one of: sword, claymore, polearm, bow, catalyst");
  }

  if (typeof candidate.knownAssociate !== "string") {
    errors.push("knownAssociate must be a string");
  } else if (candidate.framing === "companion" && candidate.knownAssociate.trim() === "") {
    errors.push("knownAssociate is required when framing is 'companion'");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
```

The cast to `string` after the typeof check is required because the loop iterates over a wider field set; without it, TypeScript narrows the type to `unknown`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/teyvat/character.test.ts`
Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/character.ts test/teyvat/character.test.ts
git commit -m "feat(teyvat): add title field to RevealedCharacter"
```

---

## Task 2: Build the canon name blocklist + matcher

**Files:**
- Create: `lib/teyvat/canonNames.ts`
- Test: `test/teyvat/canonNames.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/teyvat/canonNames.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/teyvat/canonNames.test.ts`
Expected: FAIL — "Cannot find module '@/lib/teyvat/canonNames'"

- [ ] **Step 3: Implement `canonNames.ts`**

Create `lib/teyvat/canonNames.ts`:

```ts
const CHINESE_NAMES: readonly string[] = [
  "神里绫华", "绫华",
  "神里绫人", "绫人",
  "八重神子", "神子",
  "雷电将军", "雷电影", "影",
  "九条裟罗", "裟罗",
  "宵宫",
  "枫原万叶", "万叶",
  "珊瑚宫心海", "心海",
  "荒泷一斗", "一斗",
  "久岐忍",
  "鹿野院平藏", "平藏",
  "早柚",
  "托马",
  "荧",
  "空",
  "派蒙",
  "甘雨",
  "钟离",
  "凝光",
  "刻晴",
  "胡桃",
  "魈",
  "夜兰",
  "申鹤",
  "云堇",
  "白术",
  "瑶瑶",
  "辛焱",
  "重云",
  "行秋",
  "香菱",
  "北斗",
  "烟绯",
  "七七",
  "迪卢克",
  "琴",
  "可莉",
  "丽莎",
  "安柏",
  "凯亚",
  "诺艾尔",
  "温迪",
  "芭芭拉",
  "砂糖",
  "莫娜",
  "阿贝多",
  "罗莎莉亚",
  "优菈",
  "迪奥娜",
  "雷泽",
  "菲谢尔",
  "班尼特",
  "纳西妲",
  "提纳里",
  "妮露",
  "赛诺",
  "柯莱",
  "多莉",
  "坎蒂丝",
  "莱依拉",
  "珐露珊",
  "艾尔海森",
  "迪希雅",
  "卡维",
  "流浪者", "散兵",
  "芙宁娜",
  "那维莱特",
  "莱欧斯利",
  "夏沃蕾",
  "林尼",
  "琳妮特",
  "菲米尼",
  "夏洛蒂",
  "娜维娅",
  "莱依特",
  "克洛琳德",
  "希格雯",
  "艾梅莉埃",
  "玛薇卡",
  "卡齐娜",
  "希诺宁",
  "穆阿拉尼",
  "基尼奇",
  "茜特菈莉",
  "达达利亚", "公子",
  "罗莎莉亚",
  "皇女",
];

const ENGLISH_NAMES: readonly string[] = [
  "Kamisato Ayaka", "Ayaka",
  "Kamisato Ayato", "Ayato",
  "Yae Miko",
  "Raiden Shogun", "Raiden", "Ei",
  "Kujou Sara", "Sara",
  "Yoimiya",
  "Kaedehara Kazuha", "Kazuha",
  "Sangonomiya Kokomi", "Kokomi",
  "Arataki Itto", "Itto",
  "Kuki Shinobu", "Shinobu",
  "Shikanoin Heizou", "Heizou",
  "Sayu",
  "Thoma",
  "Aether",
  "Lumine",
  "Paimon",
  "Ganyu",
  "Zhongli",
  "Ningguang",
  "Keqing",
  "Hu Tao",
  "Xiao",
  "Yelan",
  "Shenhe",
  "Yun Jin",
  "Baizhu",
  "Yaoyao",
  "Xinyan",
  "Chongyun",
  "Xingqiu",
  "Xiangling",
  "Beidou",
  "Yanfei",
  "Qiqi",
  "Diluc",
  "Jean",
  "Klee",
  "Lisa",
  "Amber",
  "Kaeya",
  "Noelle",
  "Venti",
  "Barbara",
  "Sucrose",
  "Mona",
  "Albedo",
  "Rosaria",
  "Eula",
  "Diona",
  "Razor",
  "Fischl",
  "Bennett",
  "Mika",
  "Nahida",
  "Tighnari",
  "Nilou",
  "Cyno",
  "Collei",
  "Dori",
  "Candace",
  "Layla",
  "Faruzan",
  "Alhaitham",
  "Dehya",
  "Kaveh",
  "Wanderer", "Scaramouche",
  "Furina",
  "Neuvillette",
  "Wriothesley",
  "Chevreuse",
  "Lyney",
  "Lynette",
  "Freminet",
  "Charlotte",
  "Navia",
  "Clorinde",
  "Sigewinne",
  "Emilie",
  "Mavuika",
  "Kachina",
  "Xilonen",
  "Mualani",
  "Kinich",
  "Citlali",
  "Tartaglia", "Childe",
  "Signora",
  "Pulcinella",
  "Arlecchino",
  "Pantalone",
  "Sandrone",
  "Pierro",
  "Capitano",
  "Dottore",
];

export const CANON_NAMES: readonly string[] = [...CHINESE_NAMES, ...ENGLISH_NAMES];

const HAS_CJK = /[一-鿿]/;

function isAscii(value: string): boolean {
  return !HAS_CJK.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesCanonName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const valueIsAscii = isAscii(trimmed);
  const lowerValue = trimmed.toLowerCase();

  for (const canon of CANON_NAMES) {
    const canonIsAscii = isAscii(canon);

    if (canonIsAscii !== valueIsAscii) {
      continue;
    }

    if (canonIsAscii) {
      const pattern = new RegExp(`\\b${escapeRegExp(canon)}\\b`, "i");
      if (pattern.test(trimmed)) {
        return canon;
      }
    } else {
      if (trimmed.includes(canon) || canon.includes(trimmed)) {
        return canon;
      }
    }

    void lowerValue;
  }

  return null;
}
```

A few notes on the implementation choices the engineer should not change without thinking:

- **Two passes (Chinese first, English second).** Chinese substring matching uses bidirectional `includes`. English uses regex word boundaries. Mixing the two would produce false positives (e.g. "Klee" inside the Chinese "克莱因" would match if we used substring on ASCII inputs).
- **`canonIsAscii !== valueIsAscii` skips mismatches.** A Chinese generated name should not be checked against English canon entries and vice versa, because cross-script substring matching has no useful semantics.
- **`\b` works correctly on ASCII names** because all canon English names are pure-ASCII letters. Don't change this to a Unicode property class without re-running the test suite.
- The `void lowerValue` line is a no-op kept to silence unused-variable warnings during iteration; remove it if your TypeScript config doesn't warn (it's harmless either way).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/teyvat/canonNames.test.ts`
Expected: PASS — 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/teyvat/canonNames.ts test/teyvat/canonNames.test.ts
git commit -m "feat(teyvat): add canon name blocklist and matcher"
```

---

## Task 3: Update reveal prompt with naming conventions, constraints, and title

**Files:**
- Modify: `lib/teyvat/prompts.ts`
- Test: `test/teyvat/prompts.reveal.test.ts`

- [ ] **Step 1: Update existing reveal prompt tests with new fixture and add prompt-content cases**

Edit `test/teyvat/prompts.reveal.test.ts`. Update `validJson` to include `title`, then add new cases that the prompt mentions nation conventions and the title field. Replace the file with:

```ts
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
    for (const answer of Object.values(ANSWERS)) {
      expect(prompt).toContain(answer);
    }
  });

  it("declares the framing in the prompt", () => {
    const protagonist = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const companion = buildRevealPrompt(ANSWERS, "companion", "en");
    expect(protagonist.toLowerCase()).toContain("protagonist");
    expect(companion.toLowerCase()).toContain("companion");
  });

  it("constrains the JSON output schema", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt).toContain('"vision"');
    expect(prompt).toContain('"nation"');
    expect(prompt).toContain('"knownAssociate"');
    expect(prompt).toContain('"title"');
  });

  it("specifies the output language", () => {
    const en = buildRevealPrompt(ANSWERS, "protagonist", "en");
    const zh = buildRevealPrompt(ANSWERS, "protagonist", "zh");
    expect(en).toMatch(/English/i);
    expect(zh).toMatch(/Chinese|中文/i);
  });

  it("describes nation naming conventions", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("naming convention");
    expect(prompt).toContain("Inazuma");
    expect(prompt).toContain("Liyue");
  });

  it("forbids element words in names", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("element word");
  });

  it("describes the title field with examples", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("title");
    expect(prompt).toContain("「");
  });

  it("forbids reusing canonical character names", () => {
    const prompt = buildRevealPrompt(ANSWERS, "protagonist", "en");
    expect(prompt.toLowerCase()).toContain("canonical");
  });
});

describe("parseReveal", () => {
  const validJson = JSON.stringify({
    name: "Yuna",
    title: "The Quiet Cartographer",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "polearm",
    archetype: "Wandering Cartographer",
    bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
    visionStory:
      "She drew the cliff line once more. The wave rose without mercy. The ice answered in her hand before the storm could swallow the name she was trying to keep.",
    constellation: "Lantern of Quiet Hours",
    signature: "A blade of ice that remembers the last hand it held.",
    knownAssociate: "",
  });

  it("parses raw JSON into a RevealedCharacter", () => {
    const result = parseReveal(validJson, "protagonist");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.name).toBe("Yuna");
      expect(result.character.title).toBe("The Quiet Cartographer");
      expect(result.character.framing).toBe("protagonist");
    }
  });

  it("strips json code fences", () => {
    const wrapped = `\`\`\`json\n${validJson}\n\`\`\``;
    const result = parseReveal(wrapped, "protagonist");
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = parseReveal("not json", "protagonist");
    expect(result.ok).toBe(false);
  });

  it("rejects character with bad enum values", () => {
    const bad = JSON.stringify({ ...JSON.parse(validJson), vision: "Light" });
    const result = parseReveal(bad, "protagonist");
    expect(result.ok).toBe(false);
  });

  it("attaches the framing to the parsed character", () => {
    const companion = JSON.stringify({
      ...JSON.parse(validJson),
      knownAssociate: "Wanderer — a mirror in motion",
    });
    const result = parseReveal(companion, "companion");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.framing).toBe("companion");
    }
  });

  it("rejects when the name collides with a canonical character", () => {
    const collision = JSON.stringify({ ...JSON.parse(validJson), name: "Furina" });
    const result = parseReveal(collision, "protagonist");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /canonical/i.test(e))).toBe(true);
    }
  });

  it("rejects when the title collides with a canonical character", () => {
    const collision = JSON.stringify({ ...JSON.parse(validJson), title: "Hydro Archon Furina" });
    const result = parseReveal(collision, "protagonist");
    expect(result.ok).toBe(false);
  });

  it("does NOT trip the canon check on a Chinese-substring false positive that shares no canon", () => {
    const safe = JSON.stringify({ ...JSON.parse(validJson), name: "霜见" });
    const result = parseReveal(safe, "protagonist");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new cases fail**

Run: `npx vitest run test/teyvat/prompts.reveal.test.ts`
Expected: FAIL — the prompt-content tests fail because the prompt does not yet contain "naming convention", "element word", `"title"`, "「", or "canonical". The collision tests fail because `parseReveal` does not yet check the blocklist. The `validJson` parse tests now pass through validation but were already passing — they continue to pass once `title` validation is added (Task 1, already done).

- [ ] **Step 3: Update the reveal prompt and add the canon collision check**

Edit `lib/teyvat/prompts.ts`. Two changes: (1) extend `buildRevealPrompt` with the three new prompt sections and add `"title": "..."` to the schema; (2) extend `parseReveal` to call `matchesCanonName` after validation passes.

Add the import at the top, after the existing imports:

```ts
import { matchesCanonName } from "@/lib/teyvat/canonNames";
```

Add a new constant block after `MAPPING_HINTS` (around line 34):

```ts
const NAMING_CONVENTIONS = `
Naming conventions by nation:
- Mondstadt: Germanic/European (Diluc, Jean, Klee, Albedo, Eula, Kaeya)
- Liyue: Chinese, two or three characters (甘雨, 钟离, 凝光, 行秋, 申鹤)
- Inazuma: Japanese phonetic, often family + given (神里绫华, 八重神子, 早柚, 九条裟罗)
- Sumeru: Persian/Arabic/South Asian (Nahida, Tighnari, Cyno, Dehya, Layla)
- Fontaine: French (Furina, Lyney, Lynette, Wriothesley, Clorinde)
- Natlan: Mesoamerican-inspired (Mavuika, Kachina, Kinich, Mualani)
- Snezhnaya: Russian / Slavic (Tartaglia, Pulcinella, Arlecchino)
- wandering: pick the convention that best fits the character's origin hint in their bio
`.trim();

const TITLE_GUIDANCE = `
"title" is the character's in-world epithet — the second name they're known by. Examples:
- 神里绫华「白鹭氷华」
- 甘雨「循循守月」
- 八重神子「宫司大人」
- Diluc 「Darknight Hero」
- Furina 「Hydro Archon」

The title is what others call them, or what their reputation is. It should:
- Reference their role, deed, or bearing — not their element directly
- Be 2-6 characters in Chinese, or 2-4 words in English
- Feel earned, not decorative
`.trim();
```

Then update `buildRevealPrompt`. The full updated function should be:

```ts
export function buildRevealPrompt(
  answers: TeyvatAnswers,
  framing: Framing,
  language: Language
): string {
  const outputLanguage = LANG_NAMES[language] ?? LANG_NAMES.en;
  const framingInstructions =
    framing === "protagonist"
      ? `Framing: protagonist
- This character stands alone in their own story.
- No canonical Genshin character is in the spotlight.
- "knownAssociate" must be an empty string.`
      : `Framing: companion
- This character travels alongside one canonical Genshin character such as Xiao, Zhongli, Raiden Shogun, Wanderer, Nahida, or Furina.
- Pick one whose temperament contrasts with or resonates with the reveal.
- Set "knownAssociate" to the character name, then " — ", then one short phrase of relationship.`;

  return `You are writing a character reveal for an interactive adventure set in Teyvat from Genshin Impact.

The reader gave these answers. Translate their emotional signal into in-world detail and do not echo the phrasing literally:
${answersBlock(answers)}

${MAPPING_HINTS}

${NAMING_CONVENTIONS}

${framingInstructions}

Output language: ${outputLanguage}.

Constraints:
- Do not mention a questionnaire, personality test, Big Five, meta process, or user input.
- Blend signals across all seven answers instead of mapping one answer to one trait.
- "vision" must be one of: Anemo, Geo, Electro, Dendro, Hydro, Pyro, Cryo.
- "nation" must be one of: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, wandering.
- "weapon" must be one of: sword, claymore, polearm, bow, catalyst.
- The name must follow the nation's naming convention above. A Liyue character must have a Chinese name; an Inazuma character must have a Japanese-phonetic name; a Mondstadt character must have a Germanic/European name; etc.
- Do not put element words in the name (no 霜/冰/雪 for Cryo, no 焰/火 for Pyro, no Storm/Sturm for Electro, etc.). The element shows up in the title, vision story, and signature — not the name itself.
- Avoid pure mood-word names (霜凛, Frostbite, Sturmherz). Real Teyvat names sound like names, not attributes.
- The name and title must not match, contain, or be a short form of any canonical Genshin character. The canonical examples in this prompt are for texture only — do not reuse them.
- "bio" should be 2-3 sentences of evocative character framing.
- "visionStory" must be a 3-4 sentence Vision-acquisition vignette in-scene, sensory, with the Vision answering at the climax.
- "constellation" must be 2-4 words in an evocative Genshin-like naming texture.
- "signature" must be one short line of flavor, not mechanics.
- Return JSON only. No prose before or after. No code fences.

${TITLE_GUIDANCE}

Return this exact schema:
{
  "name": "...",
  "title": "...",
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
```

Then update `parseReveal` to add the canon collision check. The full updated function:

```ts
export function parseReveal(raw: string, framing: Framing): RevealParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return {
      ok: false,
      errors: [`invalid JSON: ${(error as Error).message}`],
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["parsed JSON is not an object"] };
  }

  const candidate = { framing, ...(parsed as object) } as RevealedCharacter;
  const validation = validateRevealedCharacter(candidate);

  if (!validation.ok) {
    const nonFlavorErrors = validation.errors.filter(
      (error) => error !== "knownAssociate is required when framing is 'companion'"
    );
    if (nonFlavorErrors.length === 0) {
      return checkCanonCollisions(candidate);
    }
    return { ok: false, errors: validation.errors };
  }

  return checkCanonCollisions(candidate);
}

function checkCanonCollisions(character: RevealedCharacter): RevealParseResult {
  const nameMatch = matchesCanonName(character.name);
  const titleMatch = matchesCanonName(character.title);

  if (!nameMatch && !titleMatch) {
    return { ok: true, character };
  }

  const errors: string[] = [];
  if (nameMatch) {
    errors.push(`name '${character.name}' collides with canonical Genshin character '${nameMatch}' — pick a different name.`);
  }
  if (titleMatch) {
    errors.push(`title '${character.title}' collides with canonical Genshin character '${titleMatch}' — pick a different title.`);
  }
  return { ok: false, errors };
}
```

Note: the previous `parseReveal` body contained an early-return on the "knownAssociate flavor error" path that would have skipped the canon check. The updated version routes both paths through `checkCanonCollisions`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/teyvat/prompts.reveal.test.ts`
Expected: PASS — all 12 tests pass.

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS — all suites green. The character, prompts, and canonNames suites should all pass; smoke and provider tests should be untouched.

- [ ] **Step 6: Commit**

```bash
git add lib/teyvat/prompts.ts test/teyvat/prompts.reveal.test.ts
git commit -m "feat(teyvat): add naming conventions, title field, and canon-collision check to reveal prompt"
```

---

## Task 4: Surface parse errors into the reveal retry prompt

**Files:**
- Modify: `hooks/useAdventure.ts:352-395`

The current retry prompt says "Your previous answer was malformed. Return valid JSON only, matching the schema exactly." That's fine for JSON shape errors but does not tell the model anything useful when the parse failed because of a name collision. We pipe the actual parse errors into the retry message.

- [ ] **Step 1: Update `submitQuestionnaire` to include parse errors in the retry**

Edit `hooks/useAdventure.ts`. Replace the body of `submitQuestionnaire` (currently lines ~352-395). The retry prompt construction changes from a fixed string to one that includes the previous errors:

```ts
  const submitQuestionnaire = useCallback(
    async (answers: TeyvatAnswers, language: Language) => {
      setPhase("revealing");
      setError(null);
      setStreamingText("");

      const framing = rollFraming();
      const prompt = buildRevealPrompt(answers, framing, language);

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
        };

        setCharacter(parsed.character);
        setAdventure(nextAdventure);
        saveAdventure(nextAdventure);
        setHasSavedAdventure(true);
        setPhase("reveal-shown");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Reveal failed.");
        setPhase("questionnaire");
      }
    },
    [callJsonModel]
  );
```

This is a self-contained change. There's no test for `useAdventure` in the suite (it's a hook with provider/network dependencies), so we verify by typecheck and manual inspection.

- [ ] **Step 2: Run typecheck and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — typecheck clean, all tests green.

- [ ] **Step 3: Commit**

```bash
git add hooks/useAdventure.ts
git commit -m "feat(teyvat): pipe parse errors into reveal retry prompt"
```

---

## Task 5: Render `title` on the reveal card

**Files:**
- Modify: `components/teyvat/RevealCard.tsx`

- [ ] **Step 1: Update `RevealCard` to render the title under the name**

Edit `components/teyvat/RevealCard.tsx`. Three changes: (1) read `lang` from `useI18n` (already imported), (2) render the title below the name with language-conditional bracket treatment, (3) add the `titleStyle` const.

Replace the component body and the styles block. The full updated file:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { RevealedCharacter } from "@/lib/teyvat/character";
import {
  BORDER_SOFT,
  FONT_DISPLAY,
  INK,
  INK_FAINT,
  INK_SOFT,
  PARCHMENT,
  themeForVision,
} from "@/lib/teyvat/theme";

interface Props {
  character: RevealedCharacter;
  onAdvance: () => void;
}

export function RevealCard({ character, onAdvance }: Props) {
  const { t, lang } = useI18n();
  const [beat, setBeat] = useState(0);
  const theme = themeForVision(character.vision);

  useEffect(() => {
    setBeat(0);
    const timers = Array.from({ length: 6 }, (_, index) =>
      window.setTimeout(() => setBeat(index + 1), 120 * (index + 1))
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [character]);

  return (
    <div style={wrap}>
      <article
        style={{
          ...card,
          background: `linear-gradient(180deg, ${theme.tint}, rgba(245,236,217,0.96))`,
          border: `1px solid ${theme.border}`,
        }}
      >
        {beat >= 1 ? (
          <>
            <p style={{ ...eyebrow, color: theme.emphasis }}>{character.vision}</p>
            <h1 style={nameStyle}>{character.name}</h1>
            {character.title ? (
              <p style={titleStyle}>
                {lang === "zh" ? `「${character.title}」` : `— ${character.title} —`}
              </p>
            ) : null}
          </>
        ) : null}

        {beat >= 2 ? (
          <>
            <p style={metaLine}>
              {character.nation} · {character.weapon} · {character.archetype}
            </p>
          </>
        ) : null}

        {beat >= 3 ? <p style={bioStyle}>{character.bio}</p> : null}

        {beat >= 4 ? (
          <>
            <div style={divider} />
            <h2 style={visionHeader}>{t("day_vision_answered")}</h2>
            <p style={visionStory}>{character.visionStory}</p>
          </>
        ) : null}

        {beat >= 5 ? (
          <>
            <div style={divider} />
            <p style={constellationStyle}>{character.constellation}</p>
            <p style={signatureStyle}>{character.signature}</p>
          </>
        ) : null}

        {beat >= 6 && character.knownAssociate ? (
          <p style={associateStyle}>
            {t("travel_with")} {character.knownAssociate}
          </p>
        ) : null}

        <button type="button" style={advanceBtn} disabled={beat < 6} onClick={onAdvance}>
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
  width: "100%",
  maxWidth: 600,
  padding: "36px 28px",
  boxShadow: "0 24px 72px rgba(31,27,21,0.08)",
  textAlign: "center",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
};

const nameStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: "clamp(3rem, 7vw, 4.6rem)",
  marginTop: 8,
  lineHeight: 0.96,
};

const titleStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK_SOFT,
  fontSize: 18,
  fontStyle: "italic",
  marginTop: 6,
  marginBottom: 0,
  letterSpacing: "0.04em",
};

const metaLine: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: INK_FAINT,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const bioStyle: React.CSSProperties = {
  marginTop: 20,
  color: INK_SOFT,
  lineHeight: 1.7,
  fontSize: 16,
};

const divider: React.CSSProperties = {
  width: "100%",
  height: 1,
  background: BORDER_SOFT,
  margin: "20px 0",
};

const visionHeader: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  color: INK,
  fontSize: 28,
};

const visionStory: React.CSSProperties = {
  marginTop: 12,
  fontSize: 15,
  lineHeight: 1.8,
  color: INK_SOFT,
  fontStyle: "italic",
};

const constellationStyle: React.CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 24,
  color: INK,
};

const signatureStyle: React.CSSProperties = {
  marginTop: 6,
  color: INK_FAINT,
  fontSize: 14,
  fontStyle: "italic",
};

const associateStyle: React.CSSProperties = {
  marginTop: 16,
  color: INK_SOFT,
  fontSize: 14,
};

const advanceBtn: React.CSSProperties = {
  marginTop: 28,
  padding: "14px 24px",
  border: "none",
  background: INK,
  color: PARCHMENT,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};
```

Note the `character.title ?` guard: a resumed adventure with a pre-change schema (no `title` field) renders as before, with no broken layout.

- [ ] **Step 2: Run typecheck and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — typecheck clean, all tests green.

- [ ] **Step 3: Manually verify in the browser**

Run the dev server: `npm run dev`. Open the app, walk through Title → Questionnaire → Reveal. Confirm:

- The reveal card shows the title in italic serif under the name.
- In Chinese mode, the title is wrapped in `「」`.
- Switch to English (`?lang=en` query param) and confirm the title is wrapped in `— —`.
- The reveal beats still feel paced correctly (title appears with the name in beat 1, no awkward gap before the meta line in beat 2).

If the model returns a name that obviously violates the new constraints (element word in name, canon name, mood-word name), the corrective retry should kick in. Watch the network tab to confirm only one or two `POST /api/generate` calls happen per reveal.

- [ ] **Step 4: Commit**

```bash
git add components/teyvat/RevealCard.tsx
git commit -m "feat(teyvat): render character title on reveal card"
```

---

## Task 6: Update documentation

**Files:**
- Modify: `doc/architecture/repo-logic-and-prompt-flow.md`
- Modify: `doc/worklog/2026-05-05.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the title field, naming conventions, and collision check to the architecture doc**

Open `doc/architecture/repo-logic-and-prompt-flow.md` and find the section that describes the reveal prompt (search for `buildRevealPrompt` or the reveal flow). Append a paragraph describing the changes:

```markdown
### Reveal Naming (added 2026-05-05)

`buildRevealPrompt` enforces three naming policies in addition to the original schema constraints:

- A nation-by-nation naming-convention table (Mondstadt → Germanic, Liyue → Chinese, Inazuma → Japanese-phonetic, Sumeru → Persian/Arabic/South Asian, Fontaine → French, Natlan → Mesoamerican, Snezhnaya → Slavic, wandering → free choice). The model is told to follow the table for the chosen nation.
- An element-word ban for the `name` field (no 霜/冰/雪 for Cryo, no 焰/火 for Pyro, no Storm/Sturm for Electro, etc.). Element-coded language is allowed in the title, vision story, and signature — not the name.
- A reuse ban on canonical Genshin character names. Backed by a deterministic blocklist in `lib/teyvat/canonNames.ts` checked by `parseReveal` after schema validation; collisions return `ok: false` with a specific error, which the existing single corrective retry in `useAdventure.submitQuestionnaire` feeds back into the model.

The reveal schema also gained a `title` field (the in-world epithet, e.g. 神里绫华「白鹭氷华」). It is rendered on the reveal card directly under the name with `「」` brackets in Chinese and em-dashes in English.
```

- [ ] **Step 2: Append a worklog entry**

Open `doc/worklog/2026-05-05.md` and append:

```markdown
## Reveal name quality (afternoon)

Generated character names felt like mood words ("霜凛"), ignored nation conventions, and lacked the title/epithet texture real Genshin characters carry. Took the prompt-only path (option B from the brainstorming notes) over a two-pass naming flow.

Changes:

- Added `title` to `RevealedCharacter` and rendered it on the reveal card with `「」`/em-dash bracket treatment.
- Extended `buildRevealPrompt` with a nation-by-nation naming-convention table, an element-in-name ban, a mood-word warning, and concrete title examples.
- Added a deterministic canon-name blocklist (`lib/teyvat/canonNames.ts`) checked by `parseReveal`. Substring matching for Chinese (catches family-name leaks like "神里小百合"), word-boundary matching for English (avoids "Eulalia" → "Eula" false positives).
- Surfaced parse errors into the reveal retry prompt so the model knows what to fix on the second attempt.

Spec: [docs/superpowers/specs/2026-05-05-teyvat-reveal-name-quality-design.md](../superpowers/specs/2026-05-05-teyvat-reveal-name-quality-design.md). Plan: [docs/superpowers/plans/2026-05-05-teyvat-reveal-name-quality.md](../superpowers/plans/2026-05-05-teyvat-reveal-name-quality.md).
```

- [ ] **Step 3: Add a one-liner to `CLAUDE.md`**

Open `CLAUDE.md` and find the "Prompting" subsection of "Runtime Notes" (search for "Prompting"). The bullet list there currently mentions the editable mapping table. Append a new bullet:

```markdown
- The reveal prompt also enforces nation-specific naming conventions, bans element words in the `name` field, and rejects names that collide with the canonical Genshin roster via `lib/teyvat/canonNames.ts`. The reveal schema includes a `title` epithet field rendered with `「」` brackets in Chinese and em-dashes in English.
```

- [ ] **Step 4: Commit docs**

```bash
git add doc/architecture/repo-logic-and-prompt-flow.md doc/worklog/2026-05-05.md CLAUDE.md
git commit -m "docs(teyvat): document reveal naming policies and title field"
```

---

## Final verification

- [ ] **Run the full suite one more time**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — typecheck clean, all tests green.

- [ ] **Confirm git state is clean**

Run: `git status`
Expected: nothing to commit.

- [ ] **Inspect the commit log to confirm the change set**

Run: `git log --oneline -8`
Expected: six new commits in this order — `feat(teyvat): add title field`, `feat(teyvat): add canon name blocklist`, `feat(teyvat): add naming conventions ... to reveal prompt`, `feat(teyvat): pipe parse errors into reveal retry prompt`, `feat(teyvat): render character title on reveal card`, `docs(teyvat): document reveal naming policies and title field`.

---

## Notes for the executor

- **Do not regenerate `CANON_NAMES` from a different source** (web scraping, fan wiki). The list in this plan is intentionally curated to include common short forms; an "exhaustive" list from a wiki will miss the family-name and nickname cases that the matcher is designed to catch.
- **If a test fails during Task 3** because the canon check rejects something the test expects to pass, re-read the matcher logic in Task 2 before changing the matcher. The most common cause is the test name accidentally containing a canonical short form (e.g. naming a test character "Ayaka").
- **Manual browser verification (Task 5 step 3) is required** because there is no automated UI test for `RevealCard`. Do not skip it; the language-conditional bracket rendering is exactly the kind of thing that breaks silently if `useI18n` returns `lang` in an unexpected case.
