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
    "archetype",
    "bio",
    "visionStory",
    "constellation",
    "signature",
  ] as const) {
    if (typeof candidate[field] !== "string" || candidate[field].trim() === "") {
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