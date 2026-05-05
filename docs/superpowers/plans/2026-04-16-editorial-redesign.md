# Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual redesign of the Destiny app using Monocle/Eye editorial direction with theatrical Framer Motion animations, CSS Modules, and component restructure.

**Architecture:** Add `framer-motion` for theatrical page transitions and micro-interactions. Extract hero, tabs, and generate panel from `page.tsx` into focused components with CSS Modules. Create a shared design token system (`styles/tokens.css`) and motion config (`lib/motion.ts`). Keep `lib/theme.ts` alive for untouched components (TrajectoryCard, NoiseReviewCard, StepIndicator, WorkflowRail, NoiseSeedPanel).

**Tech Stack:** Next.js 15, React 18, Framer Motion, CSS Modules, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-16-editorial-redesign-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `styles/tokens.css` | CSS custom properties: colors, typography scale, spacing scale |
| `lib/motion.ts` | Shared Framer Motion variants, spring configs, reduced-motion helpers |
| `components/PageHeader/PageHeader.tsx` | Hero/header with theatrical entrance animation |
| `components/PageHeader/PageHeader.module.css` | Header styles |
| `components/PageTabs/PageTabs.tsx` | Editorial tab navigation with layout animation |
| `components/PageTabs/PageTabs.module.css` | Tab styles |
| `components/OptionCard/OptionCard.tsx` | Reusable option button with spring select animation |
| `components/OptionCard/OptionCard.module.css` | Option card styles |
| `components/GeneratePanel/GeneratePanel.tsx` | Generate tab extracted from page.tsx |
| `components/GeneratePanel/GeneratePanel.module.css` | Generate panel styles |
| `components/InputForm/InputForm.module.css` | Replaces inline styles in InputForm |
| `components/Big5Form/Big5Form.module.css` | Replaces inline styles in Big5Form |

### Modified files

| File | Changes |
|------|---------|
| `app/globals.css` | Import `tokens.css`, slim down to resets + keyframes + base styles |
| `app/page.tsx` | Thin orchestrator: state + AnimatePresence tab routing |
| `components/InputForm.tsx` | Move to `InputForm/InputForm.tsx`, use OptionCard + CSS Modules + Framer Motion |
| `components/Big5Form.tsx` | Move to `Big5Form/Big5Form.tsx`, use CSS Modules + Framer Motion |

### Kept as-is

| File | Reason |
|------|--------|
| `lib/theme.ts` | Still imported by untouched components (TrajectoryCard, NoiseReviewCard, StepIndicator, WorkflowRail, NoiseSeedPanel) |
| `components/StepIndicator.tsx` | Not on critical path |
| `components/TrajectoryCard.tsx` | Not on critical path |
| `components/NoiseReviewCard.tsx` | Not on critical path |
| `components/NoiseSeedPanel.tsx` | Not on critical path |
| `components/WorkflowRail.tsx` | Not on critical path |

---

## Task 1: Install framer-motion and create design tokens

**Files:**
- Create: `styles/tokens.css`
- Modify: `app/globals.css`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install framer-motion**

```bash
npm install framer-motion
```

Expected: package.json gains `"framer-motion": "^11.x"` in dependencies.

- [ ] **Step 2: Create `styles/tokens.css`**

This file holds all CSS custom properties — colors migrated from `lib/theme.ts`, plus the new typography and spacing tokens from the spec.

```css
/* styles/tokens.css */
/* ─── Design Tokens ─── */

:root {
  /* ─── Surface ─── */
  --surface: #fbf5ea;
  --paper: #fffdf6;
  --ink: #1c1917;

  /* ─── Moss (primary) ─── */
  --moss: rgba(38,84,68,1);
  --moss-88: rgba(38,84,68,0.88);
  --moss-78: rgba(38,84,68,0.78);
  --moss-68: rgba(38,84,68,0.68);
  --moss-62: rgba(38,84,68,0.62);
  --moss-bg-06: rgba(38,84,68,0.06);
  --moss-bg-09: rgba(38,84,68,0.09);
  --moss-border-16: rgba(38,84,68,0.16);
  --moss-border-24: rgba(38,84,68,0.24);
  --moss-border-38: rgba(38,84,68,0.38);

  /* ─── Plum ─── */
  --plum: rgba(88,48,74,1);
  --plum-72: rgba(88,48,74,0.72);
  --plum-bg-07: rgba(88,48,74,0.07);
  --plum-border-18: rgba(88,48,74,0.18);

  /* ─── Ink (neutrals) ─── */
  --ink-88: rgba(0,0,0,0.88);
  --ink-85: rgba(0,0,0,0.85);
  --ink-8: rgba(0,0,0,0.8);
  --ink-75: rgba(0,0,0,0.75);
  --ink-72: rgba(0,0,0,0.72);
  --ink-65: rgba(0,0,0,0.65);
  --ink-6: rgba(0,0,0,0.6);
  --ink-55: rgba(0,0,0,0.55);
  --ink-5: rgba(0,0,0,0.5);
  --ink-48: rgba(0,0,0,0.48);
  --ink-45: rgba(0,0,0,0.45);
  --ink-42: rgba(0,0,0,0.42);
  --ink-38: rgba(0,0,0,0.38);
  --ink-35: rgba(0,0,0,0.35);
  --ink-32: rgba(0,0,0,0.32);
  --ink-3: rgba(0,0,0,0.3);
  --ink-28: rgba(0,0,0,0.28);

  --ink-bg-04: rgba(0,0,0,0.04);
  --ink-bg-025: rgba(0,0,0,0.025);
  --ink-bg-02: rgba(0,0,0,0.02);
  --ink-bg-03: rgba(0,0,0,0.03);
  --ink-bg-05: rgba(0,0,0,0.05);

  --ink-border-1: rgba(0,0,0,0.1);
  --ink-border-09: rgba(0,0,0,0.09);
  --ink-border-08: rgba(0,0,0,0.08);
  --ink-border-07: rgba(0,0,0,0.07);
  --ink-border-06: rgba(0,0,0,0.06);
  --ink-border-12: rgba(0,0,0,0.12);
  --ink-border-16: rgba(0,0,0,0.16);

  /* ─── Amber (accent) ─── */
  --amber: rgba(180,110,0,1);
  --amber-92: rgba(180,110,0,0.92);
  --amber-9: rgba(180,110,0,0.9);
  --amber-88: rgba(180,110,0,0.88);
  --amber-85: rgba(180,110,0,0.85);
  --amber-82: rgba(180,110,0,0.82);
  --amber-78: rgba(180,110,0,0.78);
  --amber-75: rgba(180,110,0,0.75);
  --amber-72: rgba(180,110,0,0.72);
  --amber-7: rgba(180,110,0,0.7);
  --amber-65: rgba(180,110,0,0.65);
  --amber-62: rgba(180,110,0,0.62);
  --amber-6: rgba(180,110,0,0.6);
  --amber-55: rgba(180,110,0,0.55);

  --amber-bg-09: rgba(180,110,0,0.09);
  --amber-bg-08: rgba(180,110,0,0.08);
  --amber-bg-07: rgba(180,110,0,0.07);
  --amber-bg-04: rgba(180,110,0,0.04);
  --amber-bg-025: rgba(180,110,0,0.025);

  --amber-border-28: rgba(180,110,0,0.28);
  --amber-border-25: rgba(180,110,0,0.25);
  --amber-border-24: rgba(180,110,0,0.24);
  --amber-border-22: rgba(180,110,0,0.22);
  --amber-border-2: rgba(180,110,0,0.2);
  --amber-border-16: rgba(180,110,0,0.16);
  --amber-border-14: rgba(180,110,0,0.14);
  --amber-border-12: rgba(180,110,0,0.12);
  --amber-border-35: rgba(180,110,0,0.35);

  --amber-focus: rgba(180,110,0,0.6);
  --amber-focus-bg: rgba(180,110,0,0.08);

  /* ─── Red (danger/stop) ─── */
  --red: rgba(200,60,40,1);
  --red-88: rgba(170,50,30,0.88);
  --red-85: rgba(180,50,30,0.85);
  --red-9: rgba(170,50,30,0.9);
  --red-bg-08: rgba(200,60,40,0.08);
  --red-bg-06: rgba(200,60,40,0.06);
  --red-bg-05: rgba(200,50,30,0.05);
  --red-border-25: rgba(200,60,40,0.25);
  --red-border-22: rgba(200,60,40,0.22);
  --red-border-18: rgba(200,60,40,0.18);
  --red-border-16: rgba(200,60,40,0.16);
  --red-border-14: rgba(200,50,30,0.14);

  --gold: rgba(200,140,0,1);
  --gold-1: rgba(200,140,0,0.1);

  /* ─── Fonts ─── */
  --mono: var(--font-jetbrains), monospace;
  --serif: var(--font-source-serif), Georgia, serif;
  --serif-zh: var(--font-noto-serif-sc), var(--font-source-serif), Georgia, serif;
  --display: var(--font-playfair), Georgia, serif;
  --ui-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;

  /* ─── Typography scale (perfect fourth 1.333) ─── */
  --text-xs: 9px;
  --text-sm: 11px;
  --text-base: 14px;
  --text-lg: 17px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 42px;
  --text-hero: clamp(48px, 9vw, 72px);

  /* ─── Spacing (8px base) ─── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
}
```

- [ ] **Step 3: Update `app/globals.css` to import tokens**

Add `@import "../styles/tokens.css";` at the very top of `globals.css` (before the existing `:root` block). Remove the duplicate CSS custom property declarations from the existing `:root` block in `globals.css` — they now live in `tokens.css`. Keep the `:root` block only if it has non-token content (font variables set by Next.js font loader are injected at runtime, not in CSS, so the `:root` block with color/font vars can be fully replaced by the import).

Replace the entire existing `:root { ... }` block (lines 1–107 of `globals.css`) with:

```css
@import "../styles/tokens.css";
```

Keep everything else in `globals.css` unchanged (resets, keyframes, component classes, media queries).

- [ ] **Step 4: Verify the app still builds**

```bash
npm run build
```

Expected: Build succeeds. No visual changes yet — tokens are the same values, just moved.

- [ ] **Step 5: Commit**

```bash
git add styles/tokens.css app/globals.css package.json package-lock.json
git commit -m "feat: add framer-motion and design token system"
```

---

## Task 2: Create shared motion config

**Files:**
- Create: `lib/motion.ts`

- [ ] **Step 1: Create `lib/motion.ts`**

This file exports all shared Framer Motion variants, spring configs, and transition presets. Every animated component imports from here instead of defining its own.

```typescript
// lib/motion.ts
import type { Transition, Variants } from "framer-motion";

// ─── Spring configs ───

export const springDefault: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 28,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 24,
};

// ─── Page transitions (direction-aware) ───

export const pageVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export const pageTransition: Transition = {
  ...springDefault,
  opacity: { duration: 0.3 },
};

// ─── Stagger container ───

export function staggerContainer(staggerMs = 50): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: staggerMs / 1000,
      },
    },
  };
}

// ─── Fade up (cards, sections) ───

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: springDefault,
  },
};

// ─── Slide in from right (question titles) ───

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { ...springDefault, duration: 0.35 },
  },
};

// ─── Card select spring ───

export const cardSelectTap = {
  scale: [1, 0.97, 1.02, 1],
  transition: { duration: 0.35, times: [0, 0.2, 0.6, 1] },
};

// ─── Fade in (simple) ───

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

// ─── Bar grow (color bar) ───

export const barGrow: Variants = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.2 },
  },
};

// ─── Reduced motion fallbacks ───

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const reducedPageVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. `motion.ts` is tree-shaken since nothing imports it yet.

- [ ] **Step 3: Commit**

```bash
git add lib/motion.ts
git commit -m "feat: add shared Framer Motion config"
```

---

## Task 3: Create PageHeader component

**Files:**
- Create: `components/PageHeader/PageHeader.tsx`
- Create: `components/PageHeader/PageHeader.module.css`

- [ ] **Step 1: Create `PageHeader.module.css`**

```css
/* components/PageHeader/PageHeader.module.css */

.header {
  position: relative;
  padding: var(--space-5) var(--space-5) var(--space-6);
  padding-left: calc(var(--space-5) + 5px);
  border-left: 5px solid var(--moss);
  margin-bottom: clamp(36px, 7vw, 58px);
}

.masthead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-6);
}

.wordmark {
  font-size: var(--text-xs);
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--moss);
  font-weight: 700;
  font-family: var(--mono);
}

.issueNumber {
  font-size: var(--text-xs);
  letter-spacing: 2px;
  color: var(--ink-28);
  font-family: var(--mono);
}

.title {
  margin: 0;
  font-size: var(--text-hero);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -1px;
  color: var(--ink);
}

.titleLine {
  display: block;
}

.titleAccent {
  display: block;
  color: var(--amber);
  font-style: italic;
  margin-top: var(--space-1);
  transform: translateX(clamp(20px, 7vw, 56px));
}

.colorBar {
  display: flex;
  gap: 0;
  margin-top: var(--space-5);
  transform-origin: left center;
}

.barMoss {
  flex: 1;
  height: 5px;
  background: var(--moss);
}

.barAmber {
  flex: 0.35;
  height: 5px;
  background: var(--amber);
}

.barGhost {
  flex: 0.15;
  height: 5px;
  background: var(--ink-bg-05);
}

.subtitle {
  margin-top: var(--space-4);
  font-size: 13px;
  color: var(--ink-42);
  font-family: system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.actions {
  position: absolute;
  top: var(--space-4);
  right: 0;
  display: flex;
  gap: var(--space-2);
}

.utilityBtn {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: rgba(255,253,246,0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid var(--ink-border-12);
  border-radius: 8px;
  padding: 7px 11px;
  color: var(--ink-75);
  cursor: pointer;
  font: 600 12px/1 var(--mono);
  transition: transform 0.18s cubic-bezier(0.16,1,0.3,1),
              border-color 0.18s ease,
              background-color 0.18s ease;
}

.utilityBtn:hover {
  transform: translateY(-1px);
}

.utilityBtn[data-active="true"] {
  color: var(--moss);
  border-color: var(--moss-border-38);
  background: rgba(236,245,239,0.92);
}

.iconOnly {
  width: 38px;
  padding: 0;
}

@media (max-width: 680px) {
  .header {
    border-left: none;
    border-top: 1px solid var(--moss-border-24);
    padding-left: var(--space-4);
    padding-top: var(--space-4);
  }

  .actions {
    position: static;
    margin-bottom: var(--space-4);
  }

  .title {
    font-size: clamp(42px, 14vw, 58px);
  }

  .titleAccent {
    transform: translateX(16px);
  }
}
```

- [ ] **Step 2: Create `PageHeader.tsx`**

```tsx
// components/PageHeader/PageHeader.tsx
"use client";

import { Languages, Settings } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/i18n";
import {
  fadeIn,
  fadeUp,
  barGrow,
  staggerContainer,
  reducedMotionVariants,
} from "@/lib/motion";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

export function PageHeader({ showSettings, onToggleSettings }: PageHeaderProps) {
  const { t, lang, toggleLang } = useI18n();
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? reducedMotionVariants : fadeUp;
  const container = prefersReduced
    ? { hidden: {}, show: {} }
    : staggerContainer(300);

  return (
    <header className={styles.header}>
      <div className={styles.actions}>
        <button
          className={styles.utilityBtn}
          aria-label={lang === "en" ? "Switch to Chinese" : "切换到英文"}
          onClick={toggleLang}
        >
          <Languages size={14} strokeWidth={1.8} aria-hidden="true" />
          {lang === "en" ? "中文" : "EN"}
        </button>
        <button
          className={`${styles.utilityBtn} ${styles.iconOnly}`}
          data-active={showSettings ? "true" : "false"}
          aria-label={t("settings")}
          onClick={onToggleSettings}
          title={t("settings")}
        >
          <Settings size={15} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <motion.div
        className={styles.masthead}
        variants={prefersReduced ? reducedMotionVariants : fadeIn}
        initial="hidden"
        animate="show"
      >
        <span className={styles.wordmark}>Destiny</span>
        <span className={styles.issueNumber}>No. 01</span>
      </motion.div>

      <motion.h1
        className={styles.title}
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          fontFamily: lang === "zh" ? "var(--serif-zh)" : "var(--display)",
        }}
      >
        <motion.span className={styles.titleLine} variants={variants}>
          {t("title_1")}
        </motion.span>
        <motion.span className={styles.titleAccent} variants={variants}>
          {t("title_2")}
        </motion.span>
      </motion.h1>

      <motion.div
        className={styles.colorBar}
        variants={prefersReduced ? reducedMotionVariants : barGrow}
        initial="hidden"
        animate="show"
      >
        <div className={styles.barMoss} />
        <div className={styles.barAmber} />
        <div className={styles.barGhost} />
      </motion.div>

      <motion.div
        className={styles.subtitle}
        variants={prefersReduced ? reducedMotionVariants : fadeIn}
        initial="hidden"
        animate="show"
        transition={{ delay: prefersReduced ? 0 : 0.8 }}
      >
        {lang === "zh"
          ? "人生轨迹扩散 — 个性驱动的叙事生成"
          : "Life trajectory diffusion — personality-driven narrative generation"}
      </motion.div>
    </header>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Component is not mounted yet.

- [ ] **Step 4: Commit**

```bash
git add components/PageHeader/
git commit -m "feat: create PageHeader with editorial design and theatrical entrance"
```

---

## Task 4: Create PageTabs component

**Files:**
- Create: `components/PageTabs/PageTabs.tsx`
- Create: `components/PageTabs/PageTabs.module.css`

- [ ] **Step 1: Create `PageTabs.module.css`**

```css
/* components/PageTabs/PageTabs.module.css */

.nav {
  display: flex;
  align-items: stretch;
  margin-bottom: var(--space-7);
  position: relative;
}

.nav::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--moss-border-16);
}

.tab {
  flex: 1;
  padding: var(--space-4) var(--space-4) var(--space-5);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: opacity 0.3s ease;
}

.tab[data-active="false"] {
  opacity: 0.4;
}

.tab[data-active="false"]:hover {
  opacity: 0.65;
}

.tabNumber {
  font-size: 32px;
  font-weight: 200;
  font-family: var(--serif);
  line-height: 1;
  margin-bottom: 6px;
  color: var(--ink);
}

.tab[data-active="true"] .tabNumber {
  color: var(--moss);
}

.tabLabel {
  font-size: var(--text-sm);
  font-family: var(--mono);
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--ink);
}

.tab[data-active="true"] .tabLabel {
  color: var(--moss);
}

.activeBar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--moss);
  z-index: 1;
}

.divider {
  width: 1px;
  align-self: center;
  height: 40px;
  background: var(--ink-border-08);
  flex-shrink: 0;
}

@media (max-width: 680px) {
  .nav {
    flex-direction: column;
    gap: 0;
  }

  .divider {
    width: 100%;
    height: 1px;
  }

  .tab {
    padding: var(--space-3) var(--space-4);
  }

  .tabNumber {
    font-size: 24px;
    display: inline;
    margin-right: var(--space-2);
  }

  .tabLabel {
    display: inline;
  }

  .activeBar {
    left: 0;
    right: auto;
    top: 0;
    bottom: 0;
    width: 3px;
    height: auto;
  }
}
```

- [ ] **Step 2: Create `PageTabs.tsx`**

```tsx
// components/PageTabs/PageTabs.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/i18n";
import styles from "./PageTabs.module.css";

export type PageTab = "input" | "big5" | "generate";

interface PageTabsProps {
  active: PageTab;
  onChange: (tab: PageTab) => void;
}

const TABS: { id: PageTab; num: string; labelKey: string }[] = [
  { id: "input", num: "01", labelKey: "tab_state" },
  { id: "big5", num: "02", labelKey: "tab_personality" },
  { id: "generate", num: "03", labelKey: "tab_generate" },
];

export function PageTabs({ active, onChange }: PageTabsProps) {
  const { t } = useI18n();
  const prefersReduced = useReducedMotion();

  // Strip the "01 " prefix from tab labels — we show the number separately
  function stripNum(label: string): string {
    return label.replace(/^\d+\s*/, "");
  }

  return (
    <nav className={styles.nav} aria-label="Destiny setup steps">
      {TABS.map((tab, i) => (
        <Fragment key={tab.id}>
          {i > 0 && <div className={styles.divider} aria-hidden="true" />}
          <button
            className={styles.tab}
            data-active={active === tab.id ? "true" : "false"}
            onClick={() => onChange(tab.id)}
          >
            <div className={styles.tabNumber}>{tab.num}</div>
            <div className={styles.tabLabel}>{stripNum(t(tab.labelKey))}</div>
            {active === tab.id && (
              <motion.div
                className={styles.activeBar}
                layoutId={prefersReduced ? undefined : "tab-bar"}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 30 }
                }
              />
            )}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}

// Need Fragment import
import { Fragment } from "react";
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/PageTabs/
git commit -m "feat: create PageTabs with editorial style and layout animation"
```

---

## Task 5: Create OptionCard component

**Files:**
- Create: `components/OptionCard/OptionCard.tsx`
- Create: `components/OptionCard/OptionCard.module.css`

- [ ] **Step 1: Create `OptionCard.module.css`**

```css
/* components/OptionCard/OptionCard.module.css */

.card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: 20px 22px 20px 20px;
  text-align: left;
  border-radius: 10px;
  border: 1px solid var(--ink-border-09);
  background: rgba(255,253,246,0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  cursor: pointer;
  position: relative;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ink-8);
  line-height: 1.38;
  transition: transform 0.18s cubic-bezier(0.16,1,0.3,1),
              box-shadow 0.18s ease,
              border-color 0.18s ease,
              background 0.18s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
}

.card:active {
  transform: translateY(1px);
}

.card[data-selected="true"] {
  border: 2px solid rgba(38,84,68,0.4);
  background: linear-gradient(135deg, rgba(232,246,237,0.9), rgba(255,253,246,0.9));
  box-shadow: inset 4px 0 0 var(--moss), 0 8px 24px rgba(38,84,68,0.1);
  color: var(--ink-88);
}

.badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 10px;
  font-family: var(--mono);
  color: rgba(38,84,68,0.5);
  background: var(--moss-bg-06);
  border: 1px solid rgba(38,84,68,0.12);
  transition: all 0.2s ease;
}

.card[data-selected="true"] .badge {
  background: var(--moss);
  border-color: var(--moss);
  color: white;
}

.checkIcon {
  display: none;
}

.card[data-selected="true"] .checkIcon {
  display: block;
}

.card[data-selected="true"] .letterText {
  display: none;
}

.label {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 2: Create `OptionCard.tsx`**

```tsx
// components/OptionCard/OptionCard.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { fadeUp, reducedMotionVariants } from "@/lib/motion";
import styles from "./OptionCard.module.css";

interface OptionCardProps {
  letter: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function OptionCard({
  letter,
  label,
  selected,
  onClick,
  style,
}: OptionCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      className={styles.card}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      onClick={onClick}
      variants={prefersReduced ? reducedMotionVariants : fadeUp}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      style={style}
    >
      <div className={styles.badge}>
        <span className={styles.letterText}>{letter}</span>
        <Check
          size={14}
          strokeWidth={2.2}
          className={styles.checkIcon}
          aria-hidden="true"
        />
      </div>
      <span className={styles.label}>{label}</span>
    </motion.button>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/OptionCard/
git commit -m "feat: create OptionCard with spring selection animation"
```

---

## Task 6: Redesign InputForm

**Files:**
- Create: `components/InputForm/InputForm.module.css`
- Modify: `components/InputForm.tsx` → move to `components/InputForm/InputForm.tsx`

- [ ] **Step 1: Create `InputForm.module.css`**

```css
/* components/InputForm/InputForm.module.css */

.wrapper {
  position: relative;
}

.progressBar {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.dot {
  height: 4px;
  border-radius: 999px;
  transition: all 0.3s ease;
}

.dotActive {
  width: 24px;
  background: var(--moss);
}

.dotDone {
  width: 6px;
  background: var(--moss-border-24);
}

.dotPending {
  width: 6px;
  background: var(--ink-border-12);
}

.stepIndicator {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.ghostNumber {
  font-size: var(--text-3xl);
  font-weight: 200;
  color: rgba(180,110,0,0.18);
  font-family: var(--serif);
  line-height: 1;
}

.stepMeta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stepCounter {
  font-size: var(--text-xs);
  font-family: var(--mono);
  letter-spacing: 3px;
  color: var(--ink-3);
  text-transform: uppercase;
}

.stepHint {
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--moss-62);
  letter-spacing: 0.5px;
}

.progressDots {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.routeChip {
  display: inline-flex;
  margin-bottom: var(--space-4);
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--plum-bg-07);
  border: 1px solid var(--plum-border-18);
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--plum-72);
  letter-spacing: 0.8px;
}

.questionTitle {
  font-size: var(--text-2xl);
  color: var(--ink-85);
  margin-bottom: var(--space-4);
  line-height: 1.25;
  font-weight: 600;
}

.description {
  font-size: 15px;
  color: var(--ink-72);
  line-height: 1.6;
}

.helperText {
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--moss-88);
  font-weight: 700;
  letter-spacing: 0.6px;
}

.descRow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: var(--space-6);
}

.optionGrid {
  display: grid;
  gap: var(--space-3);
}

.selectedSummary {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: 8px;
  background: rgba(255,250,240,0.48);
  border: 1px solid var(--moss-border-16);
}

.selectedLabel {
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--moss-62);
  letter-spacing: 0.8px;
  margin-bottom: var(--space-3);
}

.selectedChips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--moss-bg-06);
  border: 1px solid var(--moss-border-16);
  font-size: var(--text-sm);
  font-family: var(--mono);
  color: var(--moss-78);
}

.footer {
  margin-top: var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.ghostBtn {
  background: none;
  border: none;
  color: var(--ink-65);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.6px;
  cursor: pointer;
  padding: 0;
  font-family: var(--mono);
}

.ghostBtn:hover {
  color: var(--ink-85);
}

.primaryBtn {
  border: 1px solid var(--moss-border-24);
  background: var(--moss);
  color: var(--paper);
  border-radius: 8px;
  padding: 12px 20px;
  font-size: var(--text-sm);
  letter-spacing: 0.8px;
  cursor: pointer;
  font-weight: 600;
  font-family: var(--mono);
}

.footerRight {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

@media (max-width: 480px) {
  .ghostNumber {
    display: none;
  }
}
```

- [ ] **Step 2: Move and rewrite `InputForm.tsx`**

Move `components/InputForm.tsx` to `components/InputForm/InputForm.tsx`. Rewrite to use `OptionCard`, CSS Modules, and Framer Motion. The component logic (questionnaire navigation, single/multi select, skip, back) stays identical — only the rendering changes.

Key changes:
- Import `OptionCard` from `@/components/OptionCard/OptionCard`
- Import `motion, AnimatePresence, useReducedMotion` from `framer-motion`
- Import `staggerContainer, slideInRight, fadeUp, reducedMotionVariants` from `@/lib/motion`
- Import `styles` from `./InputForm.module.css`
- Remove all inline `React.CSSProperties` objects (`inactiveButtonStyle`, `activeButtonStyle`, `primaryButtonStyle`, `ghostButtonStyle`)
- Remove `import { theme, mono } from "@/lib/theme"`
- Wrap option list in `motion.div` with `staggerContainer(50)` variants
- Wrap each question step in `AnimatePresence` with `slideInRight` for the question block
- Replace option `<button>` elements with `<OptionCard letter={...} label={...} selected={...} onClick={...} />`
- Letter is derived from index: `String.fromCharCode(65 + index)` (A, B, C, D...)
- Step indicator uses ghost number + progress dots instead of centered counter
- `copyForLang` helper function stays the same
- The `fontFamily` override for `lang === "zh"` on option cards moves to OptionCard's `style` prop

- [ ] **Step 3: Update import path**

Any file importing from `@/components/InputForm` needs to work. Since the new path is `@/components/InputForm/InputForm`, update the import in `app/page.tsx`:

```tsx
// Change:
import { InputForm } from "@/components/InputForm";
// To:
import { InputForm } from "@/components/InputForm/InputForm";
```

- [ ] **Step 4: Verify build and visually test**

```bash
npm run build && npm run dev
```

Open http://localhost:3000, navigate the questionnaire. Check:
- Cards render single-column with letter badges
- Selection shows checkmark + green gradient + left inset shadow
- Step indicator shows ghost number + dots
- Question transitions animate from right
- Cards stagger in from below
- Skip/back/continue buttons work correctly
- Chinese language mode renders correctly

- [ ] **Step 5: Commit**

```bash
git add components/InputForm/ components/OptionCard/
git rm components/InputForm.tsx 2>/dev/null; true
git add app/page.tsx
git commit -m "feat: redesign InputForm with OptionCard, CSS Modules, and animations"
```

---

## Task 7: Redesign Big5Form

**Files:**
- Create: `components/Big5Form/Big5Form.module.css`
- Modify: `components/Big5Form.tsx` → move to `components/Big5Form/Big5Form.tsx`

- [ ] **Step 1: Create `Big5Form.module.css`**

```css
/* components/Big5Form/Big5Form.module.css */

.description {
  color: var(--ink-6);
  font-size: var(--text-base);
  margin-bottom: var(--space-6);
  line-height: 1.7;
}

.traitCard {
  padding: 22px 24px;
  margin-bottom: var(--space-3);
  background: rgba(255,250,240,0.5);
  border: 1px solid var(--ink-border-08);
  border-radius: 8px;
}

.traitHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.traitLeft {
  display: flex;
  align-items: center;
  gap: 10px;
}

.traitIcon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.traitIconMoss {
  composes: traitIcon;
  color: var(--moss);
  background: var(--moss-bg-06);
  border: 1px solid var(--moss-border-16);
}

.traitIconPlum {
  composes: traitIcon;
  color: var(--plum);
  background: var(--plum-bg-07);
  border: 1px solid var(--plum-border-18);
}

.traitName {
  font-size: var(--text-sm) + 1px;
  font-family: var(--mono);
  color: var(--ink-75);
  letter-spacing: 0.8px;
  font-weight: 600;
}

.traitValue {
  font-size: 20px;
  font-family: var(--mono);
  color: var(--moss);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.traitQuestion {
  font-size: 15px;
  color: var(--ink-72);
  margin-bottom: var(--space-3);
  font-style: italic;
}

.traitEndpoints {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
}

.traitEndpoint {
  font-size: var(--text-xs) + 1px;
  font-family: var(--mono);
  color: var(--ink-32);
}

.vectorPanel {
  margin-top: 20px;
  padding: var(--space-4) 20px;
  background: var(--plum-bg-07);
  border: 1px solid var(--plum-border-18);
  border-radius: 8px;
}

.vectorLabel {
  font-size: var(--text-xs);
  font-family: var(--mono);
  color: var(--plum-72);
  letter-spacing: 0.8px;
  margin-bottom: var(--space-3);
}

.vectorBars {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  align-items: end;
}

.vectorItem {
  text-align: center;
}

.vectorBarContainer {
  width: 42px;
  height: 66px;
  border-radius: 6px;
  border: 1px solid var(--ink-border-07);
  background: rgba(255,250,240,0.46);
  display: flex;
  align-items: end;
  justify-content: center;
  margin: 0 auto 6px;
  padding: 5px;
}

.vectorBarFill {
  width: 100%;
  border-radius: 4px;
}

.vectorBarLabel {
  font-size: 8px;
  font-family: var(--mono);
  color: var(--ink-32);
  letter-spacing: 0.8px;
}

.navRow {
  display: flex;
  gap: var(--space-3);
  margin-top: 20px;
}

.backBtn {
  flex: 1;
  padding: 14px 0;
  background: none;
  border: 1px solid var(--ink-border-09);
  border-radius: 8px;
  color: var(--ink-42);
  font-size: var(--text-sm);
  font-family: var(--mono);
  letter-spacing: 0.8px;
  cursor: pointer;
}

.nextBtn {
  flex: 2;
  padding: 14px 0;
  background: var(--moss);
  border: 1px solid var(--moss-border-24);
  border-radius: 8px;
  color: var(--paper);
  font-size: var(--text-sm);
  font-family: var(--mono);
  letter-spacing: 0.8px;
  cursor: pointer;
}
```

- [ ] **Step 2: Move and rewrite `Big5Form.tsx`**

Move `components/Big5Form.tsx` to `components/Big5Form/Big5Form.tsx`. Rewrite to use CSS Modules and Framer Motion. The component logic stays identical.

Key changes:
- Import `motion, useReducedMotion` from `framer-motion`
- Import `staggerContainer, fadeUp, reducedMotionVariants` from `@/lib/motion`
- Import `styles` from `./Big5Form.module.css`
- Remove `import { theme, mono } from "@/lib/theme"`
- Wrap trait list in `motion.div` with `staggerContainer(80)` for staggered entrance
- Each trait card is a `motion.div` with `fadeUp` variants
- Big5 bar chart bars use `motion.div` with `initial={{ height: 0 }}` and `animate={{ height: computed }}` with stagger 60ms and spring physics
- Remove all inline style objects — use CSS Module classes

- [ ] **Step 3: Update import path in `page.tsx`**

```tsx
// Change:
import { Big5Form } from "@/components/Big5Form";
// To:
import { Big5Form } from "@/components/Big5Form/Big5Form";
```

- [ ] **Step 4: Verify build and visually test**

```bash
npm run build && npm run dev
```

Open http://localhost:3000, go to Big5 tab. Check:
- Trait cards stagger in from below
- Bar chart bars animate from 0 height
- Sliders work correctly
- Back/Next buttons work

- [ ] **Step 5: Commit**

```bash
git add components/Big5Form/
git rm components/Big5Form.tsx 2>/dev/null; true
git add app/page.tsx
git commit -m "feat: redesign Big5Form with CSS Modules and stagger animations"
```

---

## Task 8: Extract GeneratePanel

**Files:**
- Create: `components/GeneratePanel/GeneratePanel.tsx`
- Create: `components/GeneratePanel/GeneratePanel.module.css`

- [ ] **Step 1: Create `GeneratePanel.module.css`**

Create CSS Module covering the generate tab's styles: encoded state summary, guidance/steps sliders, wildcard toggle, noise placeholder, action buttons, progress section, results section, and nav buttons. Mirror the existing inline styles but using CSS custom properties from tokens.

Key classes: `.panel`, `.stateSummary`, `.chipGrid`, `.chip`, `.chipAccent`, `.sliderGroup`, `.sliderLabel`, `.sliderHint`, `.latentScanBox`, `.wildcardToggle`, `.actionBtn`, `.actionBtnStop`, `.rescanBtn`, `.quotaText`, `.progressSection`, `.resultsSection`, `.navRow`, `.navBtn`.

- [ ] **Step 2: Create `GeneratePanel.tsx`**

Extract the entire `{page === "generate" && (...)}` block from `app/page.tsx` into `components/GeneratePanel/GeneratePanel.tsx`.

Props interface:

```tsx
interface GeneratePanelProps {
  fields: Fields;
  big5: number[];
  guidance: number;
  setGuidance: (v: number) => void;
  denoiseSteps: number;
  setDenoiseSteps: (v: number) => void;
  provider: string;
  model: string;
  enableWildcard: boolean;
  setEnableWildcard: (fn: (v: boolean) => boolean) => void;
  gen: ReturnType<typeof useGeneration>;
  onNavigate: (page: "input" | "big5") => void;
}
```

Key changes:
- Import `motion, AnimatePresence, useReducedMotion` from `framer-motion`
- Import `fadeUp, staggerContainer, reducedMotionVariants` from `@/lib/motion`
- Import `styles` from `./GeneratePanel.module.css`
- Remove `import { theme, mono, labelStyles } from "@/lib/theme"` — use CSS Module classes
- Wrap the panel in `motion.div` with `fadeUp` variant
- Settings panel open/close uses `AnimatePresence` with height auto-animate
- Keep existing component imports (`WorkflowRail`, `StepIndicator`, `TrajectoryCard`, `NoiseReviewCard`, `NoiseSeedPanel`) unchanged — they still use their own inline styles

- [ ] **Step 3: Update `page.tsx` to use GeneratePanel**

```tsx
import { GeneratePanel } from "@/components/GeneratePanel/GeneratePanel";

// Replace the entire generate tab JSX block with:
{page === "generate" && (
  <GeneratePanel
    fields={fields}
    big5={big5}
    guidance={guidance}
    setGuidance={setGuidance}
    denoiseSteps={denoiseSteps}
    setDenoiseSteps={setDenoiseSteps}
    provider={provider}
    model={model}
    enableWildcard={enableWildcard}
    setEnableWildcard={setEnableWildcard}
    gen={gen}
    onNavigate={setPage}
  />
)}
```

- [ ] **Step 4: Verify build and visually test**

```bash
npm run build && npm run dev
```

Open http://localhost:3000, go to Generate tab. Check:
- All controls render and work (guidance slider, steps slider, wildcard toggle)
- Scan/denoise/stop buttons work
- Noise review cards render
- Trajectory results render
- No regressions in existing functionality

- [ ] **Step 5: Commit**

```bash
git add components/GeneratePanel/
git add app/page.tsx
git commit -m "feat: extract GeneratePanel from page.tsx with CSS Modules"
```

---

## Task 9: Rewrite page.tsx as thin orchestrator

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite `page.tsx`**

`page.tsx` becomes a thin orchestrator: state management + `AnimatePresence` tab routing. All rendering is delegated to components.

Key structure:

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/i18n";
import { useGeneration } from "@/hooks/useGeneration";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs/PageTabs";
import { InputForm } from "@/components/InputForm/InputForm";
import { Big5Form } from "@/components/Big5Form/Big5Form";
import { GeneratePanel } from "@/components/GeneratePanel/GeneratePanel";
import { buildFieldsFromAnswers } from "@/lib/questionnaire";
import { PROVIDERS, DEFAULT_PROVIDER } from "@/lib/constants";
import {
  pageVariants,
  pageTransition,
  reducedPageVariants,
} from "@/lib/motion";
import type { QuestionnaireAnswers } from "@/types";

const TAB_ORDER: PageTab[] = ["input", "big5", "generate"];

export default function Home() {
  const { t, lang, toggleLang } = useI18n();
  const prefersReduced = useReducedMotion();

  // State (same as before)
  const [page, setPage] = useState<PageTab>("input");
  const [direction, setDirection] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [questionnaireAnswers, setQuestionnaireAnswers] =
    useState<QuestionnaireAnswers>({});
  const [big5, setBig5] = useState([5, 5, 5, 5, 5]);
  const [guidance, setGuidance] = useState(7);
  const [denoiseSteps, setDenoiseSteps] = useState(4);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(PROVIDERS[DEFAULT_PROVIDER][0]);
  const [enableWildcard, setEnableWildcard] = useState(true);
  const fields = buildFieldsFromAnswers(questionnaireAnswers);

  const updateBig5 = (idx: number, val: number) =>
    setBig5((b) => { const n = [...b]; n[idx] = val; return n; });

  const gen = useGeneration({
    fields, big5, guidance, denoiseSteps,
    provider, model, lang, t, enableWildcard,
  });

  function navigateTo(tab: PageTab) {
    const from = TAB_ORDER.indexOf(page);
    const to = TAB_ORDER.indexOf(tab);
    setDirection(to > from ? 1 : -1);
    setPage(tab);
  }

  const variants = prefersReduced ? reducedPageVariants : pageVariants;

  return (
    <div data-lang={lang} className="page-shell">
      <main className="page-frame">
        <PageHeader
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />

        {/* Settings panel — kept inline since it's simple and uses theme.ts
            for untouched components. Will be extracted in a future pass. */}
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* ... settings content stays same, uses existing CSS class ... */}
          </motion.div>
        )}

        <PageTabs active={page} onChange={navigateTo} />

        <div style={{ position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait" custom={direction}>
            {page === "input" && (
              <motion.div
                key="input"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
              >
                <InputForm
                  answers={questionnaireAnswers}
                  onAnswersChange={setQuestionnaireAnswers}
                  onNext={() => navigateTo("big5")}
                />
              </motion.div>
            )}
            {page === "big5" && (
              <motion.div
                key="big5"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
              >
                <Big5Form
                  big5={big5}
                  onUpdate={updateBig5}
                  onBack={() => navigateTo("input")}
                  onNext={() => navigateTo("generate")}
                />
              </motion.div>
            )}
            {page === "generate" && (
              <motion.div
                key="generate"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
              >
                <GeneratePanel
                  fields={fields}
                  big5={big5}
                  guidance={guidance}
                  setGuidance={setGuidance}
                  denoiseSteps={denoiseSteps}
                  setDenoiseSteps={setDenoiseSteps}
                  provider={provider}
                  model={model}
                  enableWildcard={enableWildcard}
                  setEnableWildcard={setEnableWildcard}
                  gen={gen}
                  onNavigate={navigateTo}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
```

Note: The settings panel content (provider/model selection) still uses inline styles and `theme.ts` imports for now. Move the settings rendering into GeneratePanel or keep it inline — it's a minor detail. The key is that `page.tsx` is now thin.

- [ ] **Step 2: Clean up removed imports**

Remove unused imports from `page.tsx`: `ArrowLeft`, `Play`, `RefreshCw`, `Settings`, `Square`, `Languages` (now in PageHeader), `WorkflowRail`, `StepIndicator`, `TrajectoryCard`, `NoiseReviewCard`, `NoiseSeedPanel` (now in GeneratePanel), `theme`, `mono`, `labelStyles` (if settings is moved).

- [ ] **Step 3: Verify build and full visual test**

```bash
npm run build && npm run dev
```

Full test:
- Page loads with theatrical hero entrance (wordmark → title → bar → subtitle)
- Tab navigation slides content left/right with AnimatePresence
- Going forward (Input → Big5) slides left, going back slides right
- All three tabs render correctly
- Questionnaire flow works end-to-end
- Big5 sliders work
- Generate tab: scan, review, denoise flow works
- Language toggle works
- Settings panel opens/closes
- Mobile responsive at 680px and 480px breakpoints

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewrite page.tsx as thin orchestrator with AnimatePresence transitions"
```

---

## Task 10: Clean up globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Remove old component classes superseded by CSS Modules**

The following classes in `globals.css` are now handled by CSS Modules and can be removed:
- `.page-header` → `PageHeader.module.css`
- `.header-actions` → `PageHeader.module.css`
- `.utility-button` → `PageHeader.module.css`
- `.utility-button[data-active="true"]` → `PageHeader.module.css`
- `.icon-only` → `PageHeader.module.css`
- `.page-kicker` → `PageHeader.module.css`
- `.destiny-title` and related → `PageHeader.module.css`
- `.title-rule` → `PageHeader.module.css`
- `.page-tabs` → `PageTabs.module.css`
- `.page-tab` and related → `PageTabs.module.css`

Keep:
- All `@keyframes` (still used by untouched components and the CSS-only fallbacks)
- `.page-shell`, `.page-frame` (structural, still used)
- `.settings-panel` (still used inline)
- `.icon-text` (still used by untouched components)
- `.soft-panel` (might be used)
- `.trajectory-card`, `.step-reveal` (used by untouched components)
- All `input[type=range]` styles
- All `@media` queries for reduced motion and base responsive
- `::selection` style
- Base interactive transitions for `button`, `input`, `textarea`

- [ ] **Step 2: Update mobile media query**

In the `@media (max-width: 680px)` query, remove rules for `.page-header`, `.header-actions`, `.destiny-title`, `.page-tabs`, `.page-tab` — these are now in CSS Modules. Keep `.page-frame` rule.

- [ ] **Step 3: Verify build**

```bash
npm run build && npm run dev
```

Check that nothing visually broke — removed classes should all be covered by CSS Modules now.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "refactor: clean up globals.css, remove classes migrated to CSS Modules"
```

---

## Task 11: Mobile and reduced-motion polish

**Files:**
- Modify: `components/PageHeader/PageHeader.module.css`
- Modify: `components/InputForm/InputForm.module.css`
- Modify: `components/PageTabs/PageTabs.module.css`

- [ ] **Step 1: Add reduced-motion media query to CSS Modules**

Add `@media (prefers-reduced-motion: reduce)` blocks to each CSS Module that has transitions or transforms. Set `transition-duration: 0.01ms` and `animation: none` for all animated properties. This supplements Framer Motion's `useReducedMotion` hook (which handles JS animations) with CSS-level protection.

Example for `PageHeader.module.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .utilityBtn {
    transition: none;
  }
  .utilityBtn:hover {
    transform: none;
  }
}
```

Apply similar blocks to `InputForm.module.css` (for `.card` hover) and `OptionCard.module.css`.

- [ ] **Step 2: Add 480px breakpoint for ghost number**

In `InputForm.module.css`, the ghost step number should hide below 480px:

```css
@media (max-width: 480px) {
  .ghostNumber {
    display: none;
  }
}
```

(Already included in Task 6, but verify it's there.)

- [ ] **Step 3: Visual test on mobile viewport**

```bash
npm run dev
```

Open Chrome DevTools, toggle device toolbar, test at 375px (iPhone) and 768px (tablet). Check:
- Hero switches from left border to top border at 680px
- Tabs stack vertically at 680px
- Ghost number hides at 480px
- All content is readable and not overflowing
- Animations are smooth (or absent with reduced motion)

- [ ] **Step 4: Commit**

```bash
git add components/
git commit -m "fix: add reduced-motion and mobile breakpoint polish"
```

---

## Task 12: Final integration test and cleanup

- [ ] **Step 1: Full end-to-end walkthrough**

```bash
npm run dev
```

Walk through the entire app flow:
1. Page loads → hero entrance animation plays
2. Answer questionnaire questions → cards stagger in, selections spring
3. Switch to Big5 tab → page slides left, traits stagger in
4. Adjust sliders → bar chart animates
5. Switch to Generate tab → page slides left
6. Click Scan → generation works
7. Review noise fragments → keep/skip works
8. Click Denoise → trajectory cards render
9. Toggle language → all text switches, no layout breakage
10. Toggle settings → panel opens/closes
11. Resize browser → responsive breakpoints work
12. Enable "Reduce motion" in OS settings → animations reduce to fades

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Verify clean build with no warnings about unused imports or type errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after editorial redesign"
```
