import type { Language } from "@/types";
import type { Framing } from "@/lib/teyvat/character";
import type { AdventureState } from "@/lib/teyvat/scenes";
import {
  TEYVAT_STEPS,
  type QuestionnaireSchema,
  type TeyvatAnswers,
} from "@/lib/teyvat/questionnaire";
import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";
import { wishQuestionnaire } from "@/lib/teyvat/questionnaires/wishQuestionnaire";

const LANG_NAMES: Record<Language, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

function languageName(language: Language): string {
  return LANG_NAMES[language] ?? LANG_NAMES.en;
}

function answersBlock(answers: TeyvatAnswers): string {
  return TEYVAT_STEPS.map((step) => `- ${step.id}: ${answers[step.id] ?? ""}`).join("\n");
}

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

function framingBlock(framing: Framing): string {
  return framing === "protagonist"
    ? `Framing: protagonist
- This character stands alone in their own story.
- No canonical Genshin character is in the spotlight.
- "knownAssociate" must be an empty string.`
    : `Framing: companion
- This character travels alongside one canonical Genshin character such as Xiao, Zhongli, Raiden Shogun, Wanderer, Nahida, or Furina.
- Pick one whose temperament contrasts with or resonates with the reveal.
- Set "knownAssociate" to the character name, then " — ", then one short phrase of relationship.`;
}

/* ------------------------------------------------------------------
 * Variant: v1 (default — the editorial baseline)
 * ------------------------------------------------------------------ */

function buildRevealV1(
  answers: TeyvatAnswers,
  framing: Framing,
  language: Language
): string {
  const outputLanguage = languageName(language);

  return `You are writing a character reveal for an interactive adventure set in Teyvat from Genshin Impact.

The reader gave these answers. Translate their emotional signal into in-world detail and do not echo the phrasing literally:
${answersBlock(answers)}

${MAPPING_HINTS}

${NAMING_CONVENTIONS}

${framingBlock(framing)}

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

function buildSceneV1(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language
): string {
  const c = state.character;
  const outputLanguage = languageName(language);
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

/* ------------------------------------------------------------------
 * Variant: v2-tight (concise alternate — fewer hints, harder constraints)
 *
 * Hypothesis: stripping the soft-mapping table and tightening the schema
 * preamble produces sharper, less-mush reveals on capable models. Used as
 * the second arm of the default A/B split.
 * ------------------------------------------------------------------ */

function buildRevealV2(
  answers: TeyvatAnswers,
  framing: Framing,
  language: Language
): string {
  const outputLanguage = languageName(language);

  return `You are writing a character reveal for a Genshin Impact / Teyvat interactive adventure.

Reader's seven answers (treat as emotional signal, do not quote them):
${answersBlock(answers)}

${NAMING_CONVENTIONS}

${framingBlock(framing)}

Output language: ${outputLanguage}.

Hard rules:
- vision ∈ {Anemo, Geo, Electro, Dendro, Hydro, Pyro, Cryo}.
- nation ∈ {Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Snezhnaya, wandering}.
- weapon ∈ {sword, claymore, polearm, bow, catalyst}.
- Name must follow the chosen nation's naming convention. No element words in the name. No mood-word names.
- Name and title must not match, contain, or shorten to any canonical Genshin character.
- bio: 2-3 sentences. visionStory: 3-4 sentences, in-scene, Vision answers at the climax. constellation: 2-4 evocative words. signature: one short flavor line.
- Never mention a questionnaire, test, prompt, or meta process.
- Output raw JSON only — no prose, no code fences.

${TITLE_GUIDANCE}

Schema:
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

function buildSceneV2(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language
): string {
  const c = state.character;
  const outputLanguage = languageName(language);
  const storySoFar =
    state.scenes.length === 0
      ? "(scene 1 — no prior scenes)"
      : state.scenes
          .map(
            (scene) =>
              `${scene.sceneNumber}. ${scene.summary}${scene.fromChoice ? ` (chose: ${scene.fromChoice})` : ""}`
          )
          .join("\n");
  const fromChoiceLine = previousChoice
    ? `Last choice: ${previousChoice}`
    : "Opening scene — no prior choice.";
  const companionLine =
    c.framing === "companion"
      ? `Companion (recurring): ${c.knownAssociate}.`
      : "Companion: none (protagonist framing).";
  const pacing = pacingFor(sceneNumber);

  return `Scene ${sceneNumber} of an interactive Teyvat adventure (Genshin Impact).

Character: ${c.name} — ${c.vision} ${c.weapon} from ${c.nation}, ${c.archetype}.
Bio: ${c.bio}
Vision vignette: ${c.visionStory}
${companionLine}

Story so far:
${storySoFar}
${fromChoiceLine}
${pacingLine(pacing)}

Output language: ${outputLanguage}.

Rules:
- 3-5 short paragraphs inside <scene>. Concrete ${c.vision} / ${c.nation} / ${c.weapon} sensory detail. End on tension, discovery, or decision.
- Companion framing → the known associate should be felt in the scene.
- Never mention prompts, choices-as-UI, questionnaire, or personality.
- Then exactly 3 <choices>, each 3-7 words, sharply different.
- Then <closing>true|false</closing>.
- Then <summary> — exactly one sentence.

Output (use these tags in this order):
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

/* ------------------------------------------------------------------
 * Variant: v2-wish (wish-fulfillment / 爽文)
 *
 * Casts canonical Genshin characters via the candidates pipeline;
 * the reveal builder here is unused (the candidate-pick step
 * handles selection). The scene builder leans into transmigration
 * framing and 爽文 escalation, anchoring scene 1 on the chosen
 * awakening hook.
 * ------------------------------------------------------------------ */

function buildRevealWish(
  _answers: TeyvatAnswers,
  _framing: Framing,
  _language: Language
): string {
  // Unused — v2-wish goes through buildCandidatesPrompt + pickCandidate instead.
  return "";
}

function buildSceneWish(
  state: AdventureState,
  sceneNumber: number,
  previousChoice: string,
  language: Language
): string {
  const c = state.character;
  const outputLanguage = languageName(language);
  const storySoFar =
    state.scenes.length === 0
      ? "(scene 1 — the awakening)"
      : state.scenes
          .map(
            (scene) =>
              `${scene.sceneNumber}. ${scene.summary}${scene.fromChoice ? ` (chose: ${scene.fromChoice})` : ""}`
          )
          .join("\n");
  const fromChoiceLine = previousChoice
    ? `Last choice: ${previousChoice}`
    : "Opening scene — the awakening.";
  const pacing = pacingFor(sceneNumber);
  const isOpening = state.scenes.length === 0;
  const awakeningBlock =
    isOpening && c.awakeningHook
      ? `\nAwakening hook (anchor scene 1 on this — expand it, do not repeat it verbatim):\n${c.awakeningHook}\n`
      : "";

  return `Scene ${sceneNumber} of a wish-fulfillment (爽文) transmigration adventure set in Genshin Impact / Teyvat.

The reader has woken up as ${c.name} with their memories and powers intact. Lean into 爽文 tone: dominance shown through detail, validation arriving in concrete form, the world bending toward the protagonist.

Character: ${c.name} — ${c.vision} ${c.weapon} from ${c.nation}, ${c.archetype}.
Bio: ${c.bio}
${awakeningBlock}
Story so far:
${storySoFar}
${fromChoiceLine}
${pacingLine(pacing)}

Output language: ${outputLanguage}.

Rules:
- 3-5 paragraphs inside <scene>. Use ${c.vision} / ${c.nation} / ${c.weapon} concretely. End on dominance, declaration, or escalation rather than mere tension.
- Show overwhelming-ness through specific consequences (a foe stops mid-sentence, a court drops to its knees, a wall splits cleanly along a single strike). Avoid generic "you feel powerful" lines.
- Never mention prompts, choices-as-UI, questionnaire, or personality.
- Then exactly 3 <choices>, each 3-7 words. Choices should be assertive — actions the protagonist takes, not options the world offers.
- Then <closing>true|false</closing>.
- Then <summary> — exactly one sentence.

Output (use these tags in this order):
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

/* ------------------------------------------------------------------
 * Registry
 * ------------------------------------------------------------------ */

export type RevealContract =
  | { kind: "single" }
  | { kind: "candidates"; min: number; max: number };

export interface PromptVariantCapabilities {
  questionnaire: QuestionnaireSchema;
  reveal: RevealContract;
  framing: "protagonist-or-companion" | "transmigration";
  sceneTone: "editorial" | "wish-fulfillment";
}

export interface PromptVariantMeta {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export interface PromptVariant extends PromptVariantMeta {
  capabilities: PromptVariantCapabilities;
  buildReveal(answers: TeyvatAnswers, framing: Framing, language: Language): string;
  buildScene(
    state: AdventureState,
    sceneNumber: number,
    previousChoice: string,
    language: Language
  ): string;
}

export const DEFAULT_PROMPT_VARIANT_ID = "v1";

export const PROMPT_VARIANTS: PromptVariant[] = [
  {
    id: "v1",
    label: "v1 · editorial baseline",
    description:
      "The shipped reveal/scene prompts with the soft mapping table. Default arm of the A/B split.",
    weight: 1,
    capabilities: {
      questionnaire: editorialQuestionnaire,
      reveal: { kind: "single" },
      framing: "protagonist-or-companion",
      sceneTone: "editorial",
    },
    buildReveal: buildRevealV1,
    buildScene: buildSceneV1,
  },
  {
    id: "v2-tight",
    label: "v2 · tight",
    description:
      "Concise alternate: drops the soft mapping table and rewrites constraints as hard rules. Hypothesis: sharper output on strong models.",
    weight: 1,
    capabilities: {
      questionnaire: editorialQuestionnaire,
      reveal: { kind: "single" },
      framing: "protagonist-or-companion",
      sceneTone: "editorial",
    },
    buildReveal: buildRevealV2,
    buildScene: buildSceneV2,
  },
  {
    id: "v2-wish",
    label: "v2 · wish-fulfillment",
    description:
      "转生成为雷电将军-style power fantasy. Different questionnaire, picks 3-5 canonical characters, runs a 爽文 transmigration adventure.",
    weight: 0,
    capabilities: {
      questionnaire: wishQuestionnaire,
      reveal: { kind: "candidates", min: 3, max: 5 },
      framing: "transmigration",
      sceneTone: "wish-fulfillment",
    },
    buildReveal: buildRevealWish,
    buildScene: buildSceneWish,
  },
];

export function listPromptVariants(): PromptVariantMeta[] {
  return PROMPT_VARIANTS.map(({ id, label, description, weight }) => ({
    id,
    label,
    description,
    weight,
  }));
}

export function getPromptVariant(id?: string | null): PromptVariant {
  if (!id) {
    return PROMPT_VARIANTS[0];
  }
  return PROMPT_VARIANTS.find((variant) => variant.id === id) ?? PROMPT_VARIANTS[0];
}

export function isKnownPromptVariant(id: string | null | undefined): boolean {
  if (!id) {
    return false;
  }
  return PROMPT_VARIANTS.some((variant) => variant.id === id);
}

export type VariantFamily = "editorial" | "wish-fulfillment" | "other";

export function variantFamily(id: string | undefined | null): VariantFamily {
  if (!id) return "editorial";
  if (id === "v1" || id === "v2-tight") return "editorial";
  if (id === "v2-wish") return "wish-fulfillment";
  return "other";
}
