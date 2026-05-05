# Destiny — Editorial Redesign Spec

## Overview

Full visual redesign of the Destiny app using a **Monocle/Eye magazine** editorial direction with **theatrical animations**. Keeps the warm paper aesthetic but elevates typography, spacing, and motion to luxury-editorial standards.

**Dependencies added:** `framer-motion`
**Dependencies removed:** none
**Breaking changes:** `lib/theme.ts` removed, replaced by `styles/tokens.css`

---

## 1. Hero / Header

### Current → Proposed

- **Top border** → **left border accent** (5px solid moss) for a vertical editorial anchor
- **Kicker text** → **"DESTINY" wordmark** (9px, letter-spacing 4px, uppercase) with static decorative "No. 01" issue number on the right
- **Title** stays two-line with italic amber offset, but gains `-1px` letter-spacing and tighter `0.92` line-height
- **Gradient color bar** → **segmented triple-stripe**: moss (flex:1) + amber (flex:0.35) + ghost (flex:0.15), 5px height
- **New subtitle tagline** below the bar: "Life trajectory diffusion — personality-driven narrative generation"
- **Utility buttons** (lang/settings) gain `backdrop-filter: blur(4px)` and translucent background

### Theatrical entrance (on page load)

1. Wordmark fades in (200ms)
2. Title lines slide up from 20px below, staggered 300ms apart
3. Color bar width grows 0% → 100% left-to-right (600ms ease-out, 200ms delay)
4. Subtitle fades in (200ms, after bar completes)

---

## 2. Tabs

### Current → Proposed

- **Box-style tabs** → **open editorial tabs** with oversized lightweight step numbers (32px, font-weight 200) and monospace labels below
- Active tab: bottom accent bar (3px, moss), full opacity
- Inactive tabs: 40% opacity, no border
- **Vertical dividers** (1px, 40px height) between tabs replace card borders
- **Tab switch animation**: bottom accent bar slides horizontally to new tab using Framer Motion layout animation

---

## 3. Questionnaire Cards

### Layout

- **2-column grid** → **single-column stack** for all option cards
- Each card gets a **lettered badge** (A/B/C/D) — 28x28px, rounded-8, moss-tinted background, monospace letter

### Step indicator

- **Centered "01 / 10"** → **left-aligned composite**: large ghost number (42px, font-weight 200, amber at 18% opacity) + meta text block ("QUESTION 01 OF 10" + "Choose 1") + progress dots pushed to the right

### States

- **Default**: 1px border `rgba(0,0,0,0.09)`, frosted glass (`backdrop-filter: blur(4px)`), `rgba(255,253,246,0.85)` background
- **Hover**: `translateY(-2px)`, shadow increase, 180ms ease
- **Selected**: 2px border `rgba(38,84,68,0.4)`, gradient background (`rgba(232,246,237,0.9)` → `rgba(255,253,246,0.9)`), left inset shadow (4px moss), letter badge morphs to checkmark (cross-fade 200ms). Spring scale `1 → 0.97 → 1.02 → 1.0`
- **Deselect**: reverse spring

### Entrance animation

- Question title slides in from right (24px, 350ms spring)
- Option cards slide up from 16px below + fade, stagger 50ms between cards

---

## 4. Typography System

CSS custom properties in `styles/tokens.css`:

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 9px | Micro labels, letter-spacing heavy |
| `--text-sm` | 11px | Monospace meta, chip text, button labels |
| `--text-base` | 14px | Body copy, descriptions |
| `--text-lg` | 17px | Option card text |
| `--text-xl` | 22px | Section headings |
| `--text-2xl` | 28px | Question titles |
| `--text-3xl` | 42px | Ghost step numbers |
| `--text-hero` | clamp(48px, 9vw, 72px) | Hero title |

---

## 5. Spacing System

8px base grid:

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |

---

## 6. Animation System (Framer Motion)

### Page-level transitions (between tabs)

- `AnimatePresence` with direction-aware slide
- Forward (Input → Big5): current exits left + fades, new enters from right
- Back (Big5 → Input): current exits right, new enters from left
- Duration: 400ms, spring `stiffness: 300, damping: 30`
- Pages overlap briefly (absolute positioning during transition)

### Component entrances

| Component | Animation | Timing |
|-----------|-----------|--------|
| Hero title lines | Slide up 20px + fade | Stagger 300ms |
| Hero color bar | Width 0→100% L-to-R | 600ms ease-out, 200ms delay |
| Hero subtitle | Fade in | 200ms, after bar |
| Tab numbers | Count up from 0 | First mount only |
| Question title | Slide in from right 24px + fade | 350ms spring |
| Option cards | Slide up 16px + fade | Stagger 50ms |
| Progress dots | Scale 0→1 | Stagger 30ms |
| Big5 sliders | Slide up + fade | Stagger 80ms |
| Big5 bar chart | Bars grow from 0 height | Stagger 60ms, spring |

### Micro-interactions

| Interaction | Animation |
|-------------|-----------|
| Option hover | `translateY(-2px)`, shadow, 180ms ease |
| Option select | Spring `1→0.97→1.02→1.0`, badge morph, border slide |
| Option deselect | Reverse spring |
| Tab switch | Bottom bar slides (layout animation) |
| Slider thumb | Scale 1.15 on active |
| Action button hover | `translateY(-2px)`, glow pulse |
| Step transition | Cards exit down + fade, new cards enter up staggered |
| Settings panel | Height auto-animate + opacity fade |

### Reduced motion

All animations gate on `prefers-reduced-motion: reduce`. Framer Motion's `useReducedMotion` hook switches springs to crossfade-only. Existing CSS media query preserved.

---

## 7. Component Architecture

### New files

```
styles/
  tokens.css              — CSS custom properties (colors, type, spacing)

components/
  PageHeader/
    PageHeader.tsx         — extracted from page.tsx
    PageHeader.module.css
  PageTabs/
    PageTabs.tsx           — extracted from page.tsx
    PageTabs.module.css
  InputForm/
    InputForm.module.css   — replaces inline styles
  OptionCard/
    OptionCard.tsx         — NEW reusable option button with Framer Motion
    OptionCard.module.css
  Big5Form/
    Big5Form.module.css    — replaces inline styles
  GeneratePanel/
    GeneratePanel.tsx      — extracted from page.tsx (generate tab)
    GeneratePanel.module.css

lib/
  motion.ts               — shared Framer Motion variants, springs, configs
```

### Removed files

- `lib/theme.ts` — replaced by `styles/tokens.css`

### Modified files

- `app/globals.css` — slimmed down, imports `styles/tokens.css`, keeps resets and keyframes
- `app/page.tsx` — becomes thin orchestrator: state + `AnimatePresence` tab routing
- `components/InputForm.tsx` — uses `OptionCard`, CSS Modules, Framer Motion
- `components/Big5Form.tsx` — CSS Modules, Framer Motion entrances

### Untouched (for now)

- `StepIndicator`, `TrajectoryCard`, `NoiseReviewCard`, `NoiseSeedPanel`, `WorkflowRail` — keep existing inline styles, can migrate to CSS Modules in a future pass

---

## 8. Color tokens

All existing colors from `lib/theme.ts` move to CSS custom properties in `tokens.css`. The palette stays the same — no color changes, just the mechanism changes from JS to CSS.

---

## 9. Mobile behavior

- Tabs stack vertically below 680px (existing breakpoint preserved)
- Left border on hero becomes top border on mobile
- Single-column cards are already single-column, no change needed
- Entrance animations reduce stagger delays by 50% on mobile for snappier feel
- Ghost step number hides below 480px to save space
