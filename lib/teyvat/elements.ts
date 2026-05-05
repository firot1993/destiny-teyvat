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
  Anemo: { accent: "#74c2a8", tint: "#e7f3ee", emphasis: "#3f7a65" },
  Geo: { accent: "#d4a44b", tint: "#f6ecd5", emphasis: "#7a5a17" },
  Electro: { accent: "#9d7ad1", tint: "#ece4f4", emphasis: "#5a3f8a" },
  Dendro: { accent: "#9bbf3f", tint: "#eef3d6", emphasis: "#566d22" },
  Hydro: { accent: "#5aa6d4", tint: "#dceaf3", emphasis: "#2c5e7e" },
  Pyro: { accent: "#d8694b", tint: "#f4dcd2", emphasis: "#8a3a22" },
  Cryo: { accent: "#9bc8d4", tint: "#e2eef2", emphasis: "#3f6c7a" },
};

export function isVision(value: string): value is Vision {
  return (VISIONS as readonly string[]).includes(value);
}

export function isNation(value: string): value is Nation {
  return (NATIONS as readonly string[]).includes(value);
}

export function isWeapon(value: string): value is Weapon {
  return (WEAPONS as readonly string[]).includes(value);
}