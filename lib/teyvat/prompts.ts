import type { Language } from "@/types";
import {
  validateRevealedCharacter,
  type Framing,
  type RevealedCharacter,
} from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";
import { TEYVAT_STEPS, type TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import { matchesCanonName } from "@/lib/teyvat/canonNames";

const LANG_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

const MAPPING_HINTS = `
Soft mapping hints (use as inspiration, not rules):
- Q "wakeNotice = the silence that isn't empty" -> contemplative archetype, possible Sumeru or Inazuma resonance
- Q "wakeNotice = something glowing at the edge of your vision" -> curious or scholarly, Sumeru-leaning
- Q "wakeNotice = distant voices speaking a language you almost know" -> outsider or translator archetype, possibly Fontaine or Sumeru
- Q "weather = a storm that hasn't broken yet" -> Electro affinity, latent tension
- Q "weather = thin cold air after a snowfall" -> Cryo affinity, discipline
- Q "weather = midday heat with no shade" -> Pyro or Geo affinity, endurance
- Q "weather = mist that hides whatever is ahead" -> Anemo or Hydro affinity, exploratory
- Q "trade = to disappear cleanly and start over" -> wanderer or exile archetype, possibly a Snezhnayan past
- Q "trade = to keep one person safe, no matter what" -> guardian archetype, polearm or claymore likely
- Q "power = precision — doing one thing perfectly" -> bow or catalyst precision, scholar or sniper texture
- Q "power = protection — standing between harm and someone you love" -> Geo or Hydro guardian, claymore or polearm likely
- Q "fork = the one no one's taken" -> wandering nation, outcast or exile energy, often compatible with companion framing
- Q "fork = the harder climb" -> mountainous resolve, possibly Liyue or Inazuma, claymore weight
- Q "break = a blade drawn slowly" -> sword or polearm wielder, deliberate fighter
- Q "break = laughter you didn't expect" -> Anemo affinity, Mondstadt-leaning release

Blend across all seven answers. No single answer is deterministic.
`.trim();

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

interface PacingHint {
  short: string;
  closingPolicy: "must-be-false" | "may-close" | "should-close" | "must-close";
}

const PACING: Record<number, PacingHint> = {
  1: {
    short: "The call. Establish where the character is and what's pulling them in. End on the first crossroad.",
    closingPolicy: "must-be-false",
  },
  2: {
    short: "First commitment. The previous choice has consequences and the stakes become real.",
    closingPolicy: "must-be-false",
  },
  3: {
    short: "Complication. Something unexpected strains the character's assumptions.",
    closingPolicy: "must-be-false",
  },
  4: {
    short: "Crisis approaches. The shape of the real conflict becomes clear.",
    closingPolicy: "may-close",
  },
  5: {
    short: "Climax window. Strong place to close unless a major thread clearly demands extension.",
    closingPolicy: "should-close",
  },
  6: {
    short: "Closure expected. Strong push to closing=true. Only continue if a major thread is unresolved.",
    closingPolicy: "should-close",
  },
};

function answersBlock(answers: TeyvatAnswers): string {
  return TEYVAT_STEPS.map((step) => `- ${step.id}: ${answers[step.id] ?? ""}`).join("\n");
}

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

function pacingFor(sceneNumber: number): PacingHint {
  if (sceneNumber <= 6) {
    return PACING[sceneNumber];
  }

  return {
    short: "Land the plane. Write a real ending with closure that feels earned.",
    closingPolicy: "must-close",
  };
}

function pacingLine(pacing: PacingHint): string {
  const policy =
    pacing.closingPolicy === "must-be-false"
      ? "closing must be false."
      : pacing.closingPolicy === "may-close"
        ? "closing may be true or false depending on how resolved the scene becomes."
        : pacing.closingPolicy === "should-close"
          ? "Prefer closing=true unless an important thread clearly needs one more scene."
          : "closing must be true.";

  return `Pacing for this scene: ${pacing.short} ${policy}`;
}

export function buildScenePrompt(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language
): string {
  const c = state.character;
  const outputLanguage = LANG_NAMES[language] ?? LANG_NAMES.en;
  const storySoFar =
    state.scenes.length === 0
      ? "- No previous scenes yet. This is scene 1."
      : state.scenes
          .map(
            (scene) =>
              `- Scene ${scene.sceneNumber}: ${scene.summary}${scene.fromChoice ? ` | choice made: ${scene.fromChoice}` : ""}`
          )
          .join("\n");
  const fromChoiceLine = previousChoice
    ? `The choice that led into this scene: ${previousChoice}`
    : "This is the opening scene, so there is no previous choice.";
  const companionLine =
    c.framing === "companion"
      ? `- Companion presence: ${c.knownAssociate}. This canonical character should appear or be felt across most scenes, not as a one-off cameo.`
      : "- Companion presence: none. This is the protagonist framing.";
  const pacing = pacingFor(sceneNumber);

  return `You are writing scene ${sceneNumber} of an interactive Teyvat adventure set in Genshin Impact.

Character:
- Name: ${c.name}
- Vision: ${c.vision}
- Nation: ${c.nation}
- Weapon: ${c.weapon}
- Archetype: ${c.archetype}
- Bio: ${c.bio}
- Vision vignette: ${c.visionStory}
${companionLine}

Story so far:
${storySoFar}
${fromChoiceLine}
${pacingLine(pacing)}

Constraints:
- Write 3-5 paragraphs of prose inside <scene> tags.
- Use the character's element, nation, and weapon as concrete sensory detail. The scene must feel specific to ${c.vision}, ${c.nation}, and ${c.weapon}, not generic fantasy.
- If the framing is companion, the known associate should appear or be felt across this scene.
- Do not mention meta process, prompts, choices as UI, questionnaire, or personality analysis.
- End on tension, discovery, or decision.
- Then provide exactly 3 choices inside <choices> tags, each 3-7 words, evocative and meaningfully different.
- Then provide <closing>true|false</closing>.
- Then provide <summary> with exactly one sentence summarizing what happened in this scene.

Output language: ${outputLanguage}.

Use these exact tags in this exact order:
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