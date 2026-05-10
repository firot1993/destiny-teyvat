import type { Vision } from "@/lib/teyvat/elements";

export type StageKind =
  | "title" | "chapter-intro" | "question" | "reveal" | "scene" | "ending";

export type StageTier = "atmospheric" | "reading" | "theatrical";

export interface TierPalette {
  ground: string;        // CSS for the shared story-sky background
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

function nightSkyGround(accent: string, deep: string): string {
  return [
    `radial-gradient(circle at 22% 18%, ${accent}24 0%, transparent 24%)`,
    `radial-gradient(circle at 78% 12%, ${deep}36 0%, transparent 26%)`,
    "radial-gradient(circle at 18% 28%, rgba(255,250,225,0.7) 0 1px, transparent 1.8px)",
    "radial-gradient(circle at 64% 22%, rgba(255,250,225,0.52) 0 1px, transparent 1.7px)",
    "radial-gradient(circle at 82% 48%, rgba(255,250,225,0.48) 0 1px, transparent 1.8px)",
    "radial-gradient(circle at 34% 70%, rgba(255,250,225,0.42) 0 1px, transparent 1.7px)",
    "radial-gradient(circle at 54% 82%, rgba(255,250,225,0.36) 0 1px, transparent 1.6px)",
    "linear-gradient(180deg, #121d36 0%, #08111f 58%, #050914 100%)",
  ].join(", ");
}

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
        ground: nightSkyGround(accent.color, accent.deep),
        ink: "#f8edcf", inkSoft: "#d8c99f", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
      };
    case "reading":
      return {
        ground: nightSkyGround(accent.color, accent.deep),
        ink: "#f5e8c8", inkSoft: "#d8c99f", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
      };
    case "theatrical":
      return {
        ground: nightSkyGround(accent.color, accent.deep),
        ink: "#f5e8c8", inkSoft: "#d4a861", accent: accent.color, accentDeep: accent.deep,
        gold, goldBright,
        silhouette: `linear-gradient(180deg, ${accent.color} 0%, ${accent.deep} 80%, transparent 100%)`,
      };
  }
}
