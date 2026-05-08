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
