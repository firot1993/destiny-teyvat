export interface StoryScrollEffectInput {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface StoryScrollEffectMetrics {
  progress: number;
  focus: number;
  blurPx: number;
  mistOpacity: number;
  threadScale: number;
  sharpenOpacity: number;
  vignetteOpacity: number;
  ambientColor: string;
  ambientOpacity: number;
  fallingStarXvw: number;
  fallingStarYvh: number;
  fallingStarOpacity: number;
  fallingStarScale: number;
  fallingStars: FallingStarEffect[];
}

export interface FallingStarEffect {
  id: string;
  xvw: number;
  yvh: number;
  opacity: number;
  scale: number;
  rotationDeg: number;
  length: number;
  headSize: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const OPENING_NIGHT: Rgb = { r: 18, g: 29, b: 54 };
const MID_STORY_GOLD: Rgb = { r: 61, g: 54, b: 76 };
const LATE_STORY_NIGHT: Rgb = { r: 20, g: 33, b: 61 };
const FALLING_STAR_PATHS = [
  { id: "lead", xStart: 78, xEnd: 24, yStart: 9, yEnd: 90, arc: 6, rotationDeg: 124, length: 124, headSize: 9, opacity: 0.72, scale: 0.82 },
  { id: "upper", xStart: 63, xEnd: 14, yStart: 4, yEnd: 78, arc: -4, rotationDeg: 128, length: 84, headSize: 6, opacity: 0.46, scale: 0.66 },
  { id: "right", xStart: 92, xEnd: 42, yStart: 18, yEnd: 96, arc: 3, rotationDeg: 119, length: 92, headSize: 7, opacity: 0.5, scale: 0.7 },
  { id: "center", xStart: 55, xEnd: 30, yStart: 14, yEnd: 86, arc: 10, rotationDeg: 116, length: 68, headSize: 5, opacity: 0.36, scale: 0.58 },
  { id: "left", xStart: 36, xEnd: 8, yStart: 22, yEnd: 92, arc: -7, rotationDeg: 133, length: 76, headSize: 5, opacity: 0.38, scale: 0.62 },
  { id: "far", xStart: 86, xEnd: 64, yStart: 0, yEnd: 72, arc: -10, rotationDeg: 112, length: 58, headSize: 4, opacity: 0.32, scale: 0.52 },
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start: number, end: number, amount: number): number {
  return Math.round(start + (end - start) * amount);
}

function lerpRgb(start: Rgb, end: Rgb, amount: number): Rgb {
  return {
    r: lerp(start.r, end.r, amount),
    g: lerp(start.g, end.g, amount),
    b: lerp(start.b, end.b, amount),
  };
}

function rgbString(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function ambientColorFor(progress: number): string {
  if (progress <= 0.58) {
    return rgbString(lerpRgb(OPENING_NIGHT, MID_STORY_GOLD, progress / 0.58));
  }
  return rgbString(lerpRgb(MID_STORY_GOLD, LATE_STORY_NIGHT, (progress - 0.58) / 0.42));
}

function fallingStarsFor(progress: number, eased: number): FallingStarEffect[] {
  return FALLING_STAR_PATHS.map((star) => ({
    id: star.id,
    xvw: round(star.xStart + (star.xEnd - star.xStart) * progress + Math.sin(progress * Math.PI) * star.arc),
    yvh: round(star.yStart + (star.yEnd - star.yStart) * progress),
    opacity: round(star.opacity + eased * 0.14),
    scale: round(star.scale + eased * 0.16),
    rotationDeg: star.rotationDeg,
    length: star.length,
    headSize: star.headSize,
  }));
}

export function computeStoryScrollEffect(input: StoryScrollEffectInput): StoryScrollEffectMetrics {
  const maxScroll = Math.max(0, input.scrollHeight - input.clientHeight);
  const progress = maxScroll > 0 ? clamp01(input.scrollTop / maxScroll) : 0;
  const eased = easeOutCubic(progress);
  const fallingStars = fallingStarsFor(progress, eased);

  return {
    progress: round(progress),
    focus: round(0.18 + eased * 0.82),
    blurPx: round(0.4 + (1 - eased) * 2.8),
    mistOpacity: round(0.07 + (1 - eased) * 0.17),
    threadScale: round(0.04 + progress * 0.96),
    sharpenOpacity: round(0.06 + eased * 0.18),
    vignetteOpacity: round(0.16 + eased * 0.16),
    ambientColor: ambientColorFor(progress),
    ambientOpacity: round(0.12 + eased * 0.08),
    fallingStarXvw: fallingStars[0].xvw,
    fallingStarYvh: fallingStars[0].yvh,
    fallingStarOpacity: fallingStars[0].opacity,
    fallingStarScale: fallingStars[0].scale,
    fallingStars,
  };
}
