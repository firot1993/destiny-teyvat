/**
 * Promptfoo provider that builds Teyvat reveal and scene prompts locally
 * and returns the raw prompt text for contract assertions.
 */

import { buildRevealPrompt, buildScenePrompt } from "../../lib/teyvat/prompts";
import type { TeyvatAnswers } from "../../lib/teyvat/questionnaire";
import type { Framing, RevealedCharacter } from "../../lib/teyvat/character";
import type { AdventureState } from "../../lib/teyvat/scenes";
import { createTree } from "../../lib/teyvat/sceneTree";
import type { Language } from "../../types";

type PromptfooContext = {
  vars?: Record<string, unknown>;
};

type ProviderOptions = {
  id?: string;
  config?: Record<string, unknown>;
};

type ProviderResponse = {
  output?: string;
  error?: string;
};

const DEFAULT_ANSWERS: TeyvatAnswers = {
  wakeNotice: "the silence that isn't empty",
  weather: "a storm that hasn't broken yet",
  trade: "to disappear cleanly and start over",
  power: "precision — doing one thing perfectly",
  promise: "a letter you never sent",
  fork: "the harder climb",
  break: "a blade drawn slowly",
};

const DEFAULT_CHARACTER: RevealedCharacter = {
  framing: "protagonist",
  name: "Yuna",
  title: "The Quiet Cartographer",
  vision: "Cryo",
  nation: "Inazuma",
  weapon: "polearm",
  archetype: "Wandering Cartographer",
  bio: "Yuna walks the coastal roads. Her maps outlive rulers.",
  visionStory: "Yashiori. The wave. The ice answered.",
  constellation: "Lantern of Quiet Hours",
  signature: "A blade of ice that remembers the last hand it held.",
  knownAssociate: "",
};

const DEFAULT_STATE: AdventureState = {
  id: "eval-fixture",
  character: DEFAULT_CHARACTER,
  tree: createTree({
    id: "root",
    parentId: null,
    depth: 1,
    choiceTaken: null,
    prose: "She crossed the gate and the cold recognized her.",
    choices: ["follow the voice", "stay where you are", "turn back into the rain"],
    closing: false,
    summary: "Yuna arrives at the gate and recognizes the cold.",
    fromChoice: "",
  }),
  committed: true,
  ended: false,
  endedBy: null,
  startedAt: "2026-01-01T00:00:00.000Z",
};

export default class TeyvatPromptProvider {
  private providerId: string;

  constructor(options: ProviderOptions = {}) {
    this.providerId = options.id ?? "teyvat-prompt-builder";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(_prompt: string, context?: PromptfooContext): Promise<ProviderResponse> {
    const vars = context?.vars ?? {};
    const scenario = String(vars.scenario ?? "reveal");
    const lang = (vars.lang as Language) ?? "zh";

    try {
      if (scenario === "reveal") {
        const framing: Framing = (vars.framing as Framing) ?? "protagonist";
        const answers: TeyvatAnswers = (vars.answers as TeyvatAnswers) ?? DEFAULT_ANSWERS;
        const prompt = buildRevealPrompt(answers, framing, lang);
        return { output: prompt };
      }

      if (scenario === "scene") {
        const sceneNumber = Number(vars.sceneNumber ?? 2);
        const previousChoice = String(vars.previousChoice ?? "follow the voice");
        const prompt = buildScenePrompt(DEFAULT_STATE, sceneNumber, previousChoice, lang);
        return { output: prompt };
      }

      return { error: `Unknown scenario: ${scenario}` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
