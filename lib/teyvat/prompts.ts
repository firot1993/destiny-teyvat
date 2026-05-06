import type { Language } from "@/types";
import {
  validateRevealedCharacter,
  type Framing,
  type RevealedCharacter,
} from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";
import type { TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import { matchesCanonName } from "@/lib/teyvat/canonNames";
import { getPromptVariant } from "@/lib/teyvat/promptVariants";

export {
  DEFAULT_PROMPT_VARIANT_ID,
  PROMPT_VARIANTS,
  getPromptVariant,
  isKnownPromptVariant,
  listPromptVariants,
  type PromptVariant,
  type PromptVariantMeta,
} from "@/lib/teyvat/promptVariants";

export function buildRevealPrompt(
  answers: TeyvatAnswers,
  framing: Framing,
  language: Language,
  variantId?: string | null
): string {
  return getPromptVariant(variantId).buildReveal(answers, framing, language);
}

export function buildScenePrompt(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language,
  variantId?: string | null
): string {
  return getPromptVariant(variantId).buildScene(
    state,
    sceneNumber,
    previousChoice,
    language
  );
}

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export type RevealParseResult =
  | { ok: true; character: RevealedCharacter }
  | { ok: false; errors: string[] };

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

export interface ParsedSceneStream {
  complete: boolean;
  text: string;
  choices: string[];
  closing: boolean;
  summary: string;
}

function findSceneText(raw: string): string {
  const sceneOpen = raw.indexOf("<scene>");
  if (sceneOpen === -1) {
    return "";
  }

  const afterOpen = sceneOpen + "<scene>".length;
  const sceneClose = raw.indexOf("</scene>", afterOpen);
  const nextChoices = raw.indexOf("<choices>", afterOpen);

  let end = raw.length;
  if (sceneClose !== -1) {
    end = sceneClose;
  } else if (nextChoices !== -1) {
    end = nextChoices;
  }

  return raw.slice(afterOpen, end).trim();
}

function matchTag(raw: string, tag: string): string | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = raw.indexOf(open);
  if (start === -1) {
    return null;
  }

  const end = raw.indexOf(close, start + open.length);
  if (end === -1) {
    return null;
  }

  return raw.slice(start + open.length, end);
}

export function parseSceneStream(raw: string): ParsedSceneStream {
  const text = findSceneText(raw);
  const choicesRaw = matchTag(raw, "choices");
  const closingRaw = matchTag(raw, "closing");
  const summaryRaw = matchTag(raw, "summary");
  const choices = choicesRaw
    ? choicesRaw
        .split("\n")
        .map((choice) => choice.trim())
        .filter(Boolean)
    : [];

  return {
    complete: Boolean(choicesRaw && closingRaw && summaryRaw),
    text,
    choices,
    closing: closingRaw?.trim().toLowerCase() === "true",
    summary: summaryRaw?.trim() ?? "",
  };
}
