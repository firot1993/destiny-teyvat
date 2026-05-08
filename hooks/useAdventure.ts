"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, Message } from "@/types";
import {
  API_ROUTE,
  DEFAULT_PROVIDER,
  MAX_SCENES,
  PROVIDERS,
  REVEAL_MAX_TOKENS,
  SCENE_MAX_TOKENS,
} from "@/lib/constants";
import {
  archiveToLibrary,
  clearAdventure,
  clearBackNavCaches,
  hashAnswers,
  loadAdventure,
  loadLastAnswers,
  loadLastFatedReveal,
  loadLastReveal,
  loadLibrary,
  saveAdventure,
  saveLastAnswers,
  saveLastFatedReveal,
  saveLastReveal,
} from "@/lib/teyvat/storage";
import {
  buildFatedRevealPrompt,
  buildRevealPrompt,
  buildScenePrompt,
  parseFatedReveal,
  parseReveal,
  parseSceneStream,
  pickFatedCharacter,
  CANON_ROSTER,
  type CanonCharacter,
  type ParsedDirection,
} from "@/lib/teyvat/prompts";
import {
  DEFAULT_PROMPT_VARIANT_ID,
  getPromptVariant,
  listPromptVariants,
  type PromptVariantMeta,
} from "@/lib/teyvat/promptVariants";
import {
  resolvePromptVariant,
  setPromptVariant as persistPromptVariant,
} from "@/lib/teyvat/promptSwitch";
import type { Framing, RevealedCharacter } from "@/lib/teyvat/character";
import type { QuestionnaireSchema, TeyvatAnswers } from "@/lib/teyvat/questionnaire";
import type { AdventureState, Scene, StoryDirection } from "@/lib/teyvat/scenes";
import { activeScenesOf, nextSceneNumber, withSceneAppended } from "@/lib/teyvat/scenes";
import { createTree, type SceneTree } from "@/lib/teyvat/sceneTree";

export type AdventurePhase =
  | "idle"
  | "bookshelf"
  | "questionnaire"
  | "revealing"
  | "directions-generating"
  | "direction-pick"
  | "reveal-shown"
  | "scene-generating"
  | "scene-shown"
  | "ended";

export interface UseAdventureResult {
  phase: AdventurePhase;
  /** Derived loading flags (replaces raw phase checks in UI). */
  loading: { reveal: boolean; scene: boolean };
  /** True once the user has committed past the reveal (first scene generated). */
  isCommitted: boolean;
  /** Live answers collected step-by-step by the snap-scroll questionnaire. */
  answers: TeyvatAnswers;
  /** Index of the currently visible snap-scroll stage. */
  currentStageIndex: number;
  /** True while the bookshelf overlay is open. */
  bookshelfOpen: boolean;
  /** Ref to the snap-scroll document div — attach as `ref={adv.docRef}`. */
  docRef: React.RefObject<HTMLDivElement | null>;
  character: RevealedCharacter | null;
  characterImageUrl: string | null;
  adventure: AdventureState | null;
  library: AdventureState[];
  streamingText: string;
  error: string | null;
  dailyRemaining: number | null;
  dailyLimit: number | null;
  provider: string;
  model: string;
  promptVariant: string;
  availablePromptVariants: PromptVariantMeta[];
  questionnaireSchema: QuestionnaireSchema;
  fatedCharacter: CanonCharacter | null;
  revealReason: string | null;
  storyDirections: ParsedDirection[] | null;
  lastAnswers: TeyvatAnswers | null;
  hasSavedAdventure: boolean;
  /** Store a single answer without triggering generation. */
  updateAnswer(stepId: string, value: string): void;
  /** Trigger reveal/fated-reveal generation using the collected `answers`. */
  commitReveal(language: Language): Promise<void>;
  /** Scroll to a specific stage by absolute index. */
  scrollToStage(index: number): void;
  /** Scroll forward/backward by `delta` stages relative to current. */
  scrollToStageDelta(delta: number): void;
  /** Returns already-taken sibling choices at `sceneDepth` (Phase 5 will implement; returns [] for now). */
  takenChoicesAt(sceneDepth: number): string[];
  begin(): void;
  openBookshelf(): void;
  closeBookshelf(): void;
  loadFromLibrary(id: string): boolean;
  submitQuestionnaire(answers: TeyvatAnswers, language: Language): Promise<void>;
  pickDirection(id: string, language: Language): Promise<void>;
  goBackToQuestionnaire(): void;
  enterWorld(language: Language): Promise<void>;
  chooseChoice(choice: string, language: Language): Promise<void>;
  stopHere(): void;
  startOver(): void;
  resumeAdventure(): boolean;
  setProvider(provider: string): void;
  setModel(model: string): void;
  setPromptVariant(id: string): void;
}

function defaultModel(provider: string): string {
  return PROVIDERS[provider]?.[0] ?? PROVIDERS[DEFAULT_PROVIDER]?.[0] ?? "openai/gpt-5.4";
}

function rollFraming(): Framing {
  return Math.random() < 0.5 ? "protagonist" : "companion";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function freshAdventure(
  character: RevealedCharacter,
  variantId: string,
  opts: { revealReason?: string; storyDirection?: StoryDirection | null } = {}
): AdventureState {
  return {
    id: generateId(),
    character,
    tree: createTree({
      id: generateId(),
      parentId: null,
      depth: 1,
      choiceTaken: null,
      // Empty root prose — overwritten on first scene generation.
      prose: "",
      choices: [],
      closing: false,
      summary: "",
      fromChoice: "",
    }),
    ended: false,
    endedBy: null,
    startedAt: new Date().toISOString(),
    variantId,
    committed: false,
    revealReason: opts.revealReason,
    storyDirection: opts.storyDirection ?? null,
  };
}

function parseHeaderInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractResponseText(payload: { content?: Array<{ type: string; text: string }> }): string {
  if (!payload.content) {
    return "";
  }

  return payload.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function extractSseText(rawStream: string): string {
  let fullText = "";
  for (const line of rawStream.split(/\r?\n/)) {
    const normalized = line.trim();
    if (!normalized.startsWith("data:")) {
      continue;
    }

    const data = normalized.slice(5).trim();
    if (!data || data === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
      }
    } catch {
    }
  }
  return fullText;
}

export function useAdventure(): UseAdventureResult {
  const [phase, setPhase] = useState<AdventurePhase>("idle");
  const [character, setCharacter] = useState<RevealedCharacter | null>(null);
  const [adventure, setAdventure] = useState<AdventureState | null>(null);
  const [library, setLibrary] = useState<AdventureState[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [provider, setProviderState] = useState(DEFAULT_PROVIDER);
  const [model, setModelState] = useState(() => defaultModel(DEFAULT_PROVIDER));
  const [hasSavedAdventure, setHasSavedAdventure] = useState(false);
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const [promptVariant, setPromptVariantState] = useState<string>(DEFAULT_PROMPT_VARIANT_ID);
  const [fatedCharacter, setFatedCharacter] = useState<CanonCharacter | null>(null);
  const [revealReason, setRevealReason] = useState<string | null>(null);
  const [storyDirections, setStoryDirections] = useState<ParsedDirection[] | null>(null);
  const [lastAnswers, setLastAnswers] = useState<TeyvatAnswers | null>(null);
  // Stage-index + snap-scroll state
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [answers, setAnswers] = useState<TeyvatAnswers>({});
  const docRef = useRef<HTMLDivElement | null>(null);
  const availablePromptVariants = listPromptVariants();
  const questionnaireSchema = getPromptVariant(promptVariant).capabilities.questionnaire;

  const refreshLibrary = useCallback(() => {
    setLibrary(loadLibrary());
  }, []);

  useEffect(() => {
    setHasSavedAdventure(Boolean(loadAdventure()));
    refreshLibrary();
    setPromptVariantState(resolvePromptVariant());
    setLastAnswers(loadLastAnswers());
  }, [refreshLibrary]);

  const updateQuotaHeaders = useCallback((response: Response) => {
    const nextRemaining = parseHeaderInt(response.headers.get("X-Daily-Remaining"));
    const nextLimit = parseHeaderInt(response.headers.get("X-Daily-Limit"));

    if (nextRemaining !== null) {
      setDailyRemaining(nextRemaining);
    }
    if (nextLimit !== null) {
      setDailyLimit(nextLimit);
    }
  }, []);

  const callJsonModel = useCallback(
    async (messages: Message[], maxTokens: number): Promise<string> => {
      const response = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          max_tokens: maxTokens,
          temperature: 0.9,
          messages,
        }),
      });

      updateQuotaHeaders(response);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API ${response.status}`);
      }

      const payload = (await response.json()) as { content?: Array<{ type: string; text: string }> };
      const text = extractResponseText(payload);
      if (!text) {
        throw new Error("Generation returned no text content.");
      }
      return text;
    },
    [model, provider, updateQuotaHeaders]
  );

  const generateCharacterImage = useCallback(
    async (char: RevealedCharacter) => {
      try {
        const prompt = `Genshin Impact official character portrait, anime illustration style. A ${char.vision} vision wielder from ${char.nation}, using a ${char.weapon}. ${char.archetype}. ${char.bio} Genshin Impact art style, high quality, detailed character illustration, fantasy RPG, upper body portrait, dramatic lighting. No text, no words, no letters, no watermarks, no signatures, no captions in the image.`;
        const response = await fetch("/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { url?: string };
        if (data.url) {
          setCharacterImageUrl(data.url);
          const cached = loadLastReveal();
          if (cached && cached.character.name === char.name) {
            saveLastReveal({ ...cached, imageUrl: data.url });
          }
        }
      } catch {
        // Image generation is best-effort — never block the reveal flow.
      }
    },
    []
  );

  const streamScene = useCallback(
    async (messages: Message[], maxTokens: number): Promise<string> => {
      const response = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          max_tokens: maxTokens,
          temperature: 0.95,
          messages,
          stream: true,
        }),
      });

      updateQuotaHeaders(response);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const payload = (await response.json()) as { content?: Array<{ type: string; text: string }> };
        return extractResponseText(payload);
      }

      const clonedResponse = response.clone();
      if (!response.body || typeof response.body.getReader !== "function") {
        const fallbackText = await clonedResponse.text();
        const decoded = extractSseText(fallbackText);
        if (!decoded) {
          throw new Error("Streaming API returned no text content.");
        }
        setStreamingText(decoded);
        return decoded;
      }

      let fullText = "";
      let rawStream = "";
      let bufferedLine = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const processLine = (line: string) => {
        const normalized = line.trim();
        if (!normalized.startsWith("data:")) {
          return;
        }

        const data = normalized.slice(5).trim();
        if (!data || data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            setStreamingText(fullText);
          }
        } catch {
        }
      };

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          rawStream += chunk;
          bufferedLine += chunk;
          const lines = bufferedLine.split(/\r?\n/);
          bufferedLine = lines.pop() ?? "";
          for (const line of lines) {
            processLine(line);
          }
        }
        const tail = decoder.decode();
        rawStream += tail;
        bufferedLine += tail;
        if (bufferedLine.trim()) {
          processLine(bufferedLine);
        }
      } catch {
        const fallbackText = await clonedResponse.text();
        fullText = extractSseText(fallbackText);
        if (fullText) {
          setStreamingText(fullText);
        }
      } finally {
        reader.releaseLock();
      }

      if (!fullText) {
        fullText = extractSseText(rawStream);
        if (fullText) {
          setStreamingText(fullText);
        }
      }

      if (!fullText) {
        throw new Error("Streaming API returned no text content.");
      }

      return fullText;
    },
    [model, provider, updateQuotaHeaders]
  );

  const generateScene = useCallback(
    async (currentAdventure: AdventureState, previousChoice: string, language: Language) => {
      setPhase("scene-generating");
      setError(null);
      setStreamingText("");

      const sceneNumber = nextSceneNumber(currentAdventure);
      const prompt = buildScenePrompt(
        currentAdventure,
        sceneNumber,
        previousChoice,
        language,
        promptVariant
      );
      const raw = await streamScene([{ role: "user", content: prompt }], SCENE_MAX_TOKENS);
      const parsed = parseSceneStream(raw);

      if (!parsed.text.trim()) {
        throw new Error("Scene generation returned no scene text.");
      }

      const forcedClosing = sceneNumber >= MAX_SCENES;
      const isFirstScene = !currentAdventure.committed;

      let nextAdventure: AdventureState;
      if (isFirstScene) {
        // Overwrite the empty root node in place with the first scene's content
        const rootId = currentAdventure.tree.rootId;
        const replacedTree: SceneTree = {
          ...currentAdventure.tree,
          nodes: {
            ...currentAdventure.tree.nodes,
            [rootId]: {
              ...currentAdventure.tree.nodes[rootId],
              prose: parsed.text,
              choices: parsed.choices,
              closing: forcedClosing ? true : parsed.closing,
              summary: parsed.summary || `Scene 1`,
              fromChoice: previousChoice,
            },
          },
        };
        nextAdventure = {
          ...currentAdventure,
          tree: replacedTree,
          committed: true,
          ended: forcedClosing ? true : parsed.closing,
          endedBy: forcedClosing || parsed.closing ? "model" : null,
        };
      } else {
        const scene: Scene = {
          sceneNumber,
          text: parsed.text,
          choices: parsed.choices,
          closing: forcedClosing ? true : parsed.closing,
          summary: parsed.summary || `Scene ${sceneNumber} completed.`,
          fromChoice: previousChoice,
        };
        nextAdventure = {
          ...withSceneAppended(currentAdventure, generateId(), previousChoice, scene),
          ended: forcedClosing ? true : parsed.closing,
          endedBy: forcedClosing || parsed.closing ? "model" : null,
        };
      }

      setAdventure(nextAdventure);
      saveAdventure(nextAdventure);
      setHasSavedAdventure(true);
      if (nextAdventure.ended) {
        archiveToLibrary(nextAdventure);
        refreshLibrary();
      }
      setPhase(nextAdventure.ended ? "ended" : "scene-shown");
    },
    [streamScene, refreshLibrary, promptVariant]
  );

  const begin = useCallback(() => {
    setError(null);
    setStreamingText("");
    setPhase("questionnaire");
  }, []);

  const generateCanonPortrait = useCallback(
    async (c: CanonCharacter) => {
      try {
        const portraitPrompt = `Genshin Impact official character portrait of ${c.nameEn}, anime illustration style, ${c.vision} vision wielder from ${c.nation}, using a ${c.weapon}, upper body, dramatic lighting. No text, no words, no letters, no watermarks, no signatures, no captions in the image.`;
        const response = await fetch("/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: portraitPrompt }),
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { url?: string };
        if (data.url) {
          setCharacterImageUrl(data.url);
          const cached = loadLastFatedReveal();
          if (cached && cached.fatedCharacter.id === c.id) {
            saveLastFatedReveal({ ...cached, imageUrl: data.url });
          }
        }
      } catch {
        // best-effort; never blocks
      }
    },
    []
  );

  const submitQuestionnaire = useCallback(
    async (answers: TeyvatAnswers, language: Language) => {
      setError(null);
      setStreamingText("");

      // Persist answers immediately so a back-nav can prefill them.
      saveLastAnswers(answers);
      setLastAnswers(answers);

      const variant = getPromptVariant(promptVariant);
      const answersHash = hashAnswers(answers);

      if (variant.capabilities.reveal.kind === "fated-with-directions") {
        // Cache hit: same answers + same variant → skip the LLM call and show the prior pick.
        const cached = loadLastFatedReveal();
        if (cached && cached.answersHash === answersHash && cached.variantId === promptVariant) {
          setFatedCharacter(cached.fatedCharacter);
          setRevealReason(cached.revealReason);
          setStoryDirections(cached.directions);
          setCharacterImageUrl(cached.imageUrl);
          setCharacter(null);
          setAdventure(null);
          setPhase("direction-pick");
          return;
        }

        setPhase("directions-generating");
        try {
          const fated = pickFatedCharacter(CANON_ROSTER, answers);
          const prompt = buildFatedRevealPrompt(answers, fated, language);
          const firstRaw = await callJsonModel([{ role: "user", content: prompt }], REVEAL_MAX_TOKENS);
          let parsed = parseFatedReveal(firstRaw);

          if (!parsed.ok) {
            const errorList = parsed.errors.map((e) => `- ${e}`).join("\n");
            const retryPrompt = `${prompt}\n\nYour previous answer had these problems:\n${errorList}\n\nReturn valid JSON only, matching the schema exactly, with all problems above fixed.`;
            const retryRaw = await callJsonModel([{ role: "user", content: retryPrompt }], REVEAL_MAX_TOKENS);
            parsed = parseFatedReveal(retryRaw);
          }

          if (!parsed.ok) {
            throw new Error(parsed.errors.join(" | "));
          }

          setFatedCharacter(fated);
          setRevealReason(parsed.why);
          setStoryDirections(parsed.directions);
          setCharacterImageUrl(null);
          setCharacter(null);
          setAdventure(null);
          setPhase("direction-pick");

          saveLastFatedReveal({
            answersHash,
            variantId: promptVariant,
            fatedCharacter: fated,
            revealReason: parsed.why,
            directions: parsed.directions,
            imageUrl: null,
          });

          void generateCanonPortrait(fated);
          return;
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Fated reveal failed.");
          setPhase("questionnaire");
          return;
        }
      }

      // Single-reveal cache hit
      const cachedReveal = loadLastReveal();
      if (cachedReveal && cachedReveal.answersHash === answersHash && cachedReveal.variantId === promptVariant) {
        const nextAdventure = freshAdventure(cachedReveal.character, promptVariant);
        setCharacter(cachedReveal.character);
        setCharacterImageUrl(cachedReveal.imageUrl);
        setAdventure(nextAdventure);
        saveAdventure(nextAdventure);
        setHasSavedAdventure(true);
        setPhase("reveal-shown");
        return;
      }

      setPhase("revealing");

      const framing = rollFraming();
      const prompt = buildRevealPrompt(answers, framing, language, promptVariant);

      try {
        const firstRaw = await callJsonModel([{ role: "user", content: prompt }], REVEAL_MAX_TOKENS);
        let parsed = parseReveal(firstRaw, framing);

        if (!parsed.ok) {
          const errorList = parsed.errors.map((e) => `- ${e}`).join("\n");
          const retryPrompt = `${prompt}\n\nYour previous answer had these problems:\n${errorList}\n\nReturn valid JSON only, matching the schema exactly, with all problems above fixed.`;
          const retryRaw = await callJsonModel([{ role: "user", content: retryPrompt }], REVEAL_MAX_TOKENS);
          parsed = parseReveal(retryRaw, framing);
        }

        if (!parsed.ok) {
          throw new Error(parsed.errors.join(" | "));
        }

        const nextAdventure = freshAdventure(parsed.character, promptVariant);

        setCharacter(parsed.character);
        setCharacterImageUrl(null);
        setAdventure(nextAdventure);
        saveAdventure(nextAdventure);
        setHasSavedAdventure(true);
        setPhase("reveal-shown");

        saveLastReveal({
          answersHash,
          variantId: promptVariant,
          framing,
          character: parsed.character,
          imageUrl: null,
        });

        void generateCharacterImage(parsed.character);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Reveal failed.");
        setPhase("questionnaire");
      }
    },
    [callJsonModel, generateCharacterImage, generateCanonPortrait, promptVariant]
  );

  const pickDirection = useCallback(
    async (id: string, language: Language) => {
      if (!fatedCharacter || !storyDirections || !revealReason) {
        return;
      }
      const direction = storyDirections.find((d) => d.id === id);
      if (!direction) {
        return;
      }

      const c = fatedCharacter;
      const archetype = c.archetypeBlurb[language] ?? c.archetypeBlurb.en;
      const bio = c.bioBlurb[language] ?? c.bioBlurb.en;
      const displayName = language === "zh" ? c.nameZh : c.nameEn;

      const character: RevealedCharacter = {
        framing: "protagonist",
        name: displayName,
        title: c.nameEn,
        vision: c.vision,
        nation: c.nation,
        weapon: c.weapon,
        archetype,
        bio,
        visionStory: direction.hook,
        constellation: "—",
        signature: "—",
        knownAssociate: "",
        awakeningHook: direction.hook,
      };

      const storyDirection: StoryDirection = {
        id: direction.id,
        title: direction.title,
        hook: direction.hook,
      };

      const nextAdventure = freshAdventure(character, promptVariant, { revealReason, storyDirection });

      setCharacter(character);
      setAdventure(nextAdventure);
      saveAdventure(nextAdventure);
      setHasSavedAdventure(true);

      try {
        await generateScene(nextAdventure, "", language);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Scene generation failed.");
        setPhase("direction-pick");
      }
    },
    [fatedCharacter, storyDirections, revealReason, generateScene, promptVariant]
  );

  const enterWorld = useCallback(
    async (language: Language) => {
      const currentAdventure =
        adventure ??
        (character
          ? freshAdventure(character, promptVariant)
          : null);

      if (!currentAdventure) {
        return;
      }

      try {
        await generateScene(currentAdventure, "", language);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Scene generation failed.");
        setPhase("reveal-shown");
      }
    },
    [adventure, character, generateScene, promptVariant]
  );

  const chooseChoice = useCallback(
    async (choice: string, language: Language) => {
      if (!adventure) {
        return;
      }

      try {
        await generateScene(adventure, choice, language);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Scene generation failed.");
        setPhase("scene-shown");
      }
    },
    [adventure, generateScene]
  );

  const goBackToQuestionnaire = useCallback(() => {
    // Returns the user to the questionnaire from a reveal/direction-pick stage,
    // preserving their last answers for prefill. The reveal/direction caches
    // remain intact so a same-answer resubmit short-circuits to the cached pick.
    setError(null);
    setStreamingText("");
    setPhase("questionnaire");
  }, []);

  const stopHere = useCallback(() => {
    if (!adventure) {
      return;
    }

    const nextAdventure: AdventureState = {
      ...adventure,
      ended: true,
      endedBy: "user",
    };

    setAdventure(nextAdventure);
    saveAdventure(nextAdventure);
    archiveToLibrary(nextAdventure);
    refreshLibrary();
    setHasSavedAdventure(true);
    setPhase("ended");
  }, [adventure, refreshLibrary]);

  const startOver = useCallback(() => {
    // Archive the current adventure if it has scenes
    const current = loadAdventure();
    if (current && activeScenesOf(current).length > 0) {
      archiveToLibrary(current);
    }
    clearAdventure();
    clearBackNavCaches();
    setCharacter(null);
    setCharacterImageUrl(null);
    setAdventure(null);
    setFatedCharacter(null);
    setRevealReason(null);
    setStoryDirections(null);
    setLastAnswers(null);
    setStreamingText("");
    setError(null);
    setPhase("idle");
    setHasSavedAdventure(false);
    refreshLibrary();
  }, [refreshLibrary]);

  const openBookshelf = useCallback(() => {
    refreshLibrary();
    setPhase("bookshelf");
  }, [refreshLibrary]);

  const closeBookshelf = useCallback(() => {
    setPhase("idle");
  }, []);

  const loadFromLibrary = useCallback((id: string): boolean => {
    const lib = loadLibrary();
    const entry = lib.find((e) => e.id === id);
    if (!entry) {
      return false;
    }

    // Archive current in-progress adventure if it has content
    const current = loadAdventure();
    if (current && activeScenesOf(current).length > 0 && current.id !== id) {
      archiveToLibrary(current);
    }

    setAdventure(entry);
    setCharacter(entry.character);
    saveAdventure(entry);
    setStreamingText("");
    setError(null);
    setHasSavedAdventure(true);
    refreshLibrary();

    if (entry.ended) {
      setPhase("ended");
    } else if (activeScenesOf(entry).length > 0) {
      setPhase("scene-shown");
    } else {
      setPhase("reveal-shown");
    }
    return true;
  }, [refreshLibrary]);

  const resumeAdventure = useCallback(() => {
    const saved = loadAdventure();
    if (!saved) {
      return false;
    }

    setAdventure(saved);
    setCharacter(saved.character);
    setStreamingText("");
    setError(null);
    setHasSavedAdventure(true);
    if (saved.ended) {
      setPhase("ended");
    } else if (activeScenesOf(saved).length > 0) {
      setPhase("scene-shown");
    } else {
      setPhase("reveal-shown");
    }
    return true;
  }, []);

  const setProvider = useCallback((nextProvider: string) => {
    setProviderState(nextProvider);
    setModelState(defaultModel(nextProvider));
  }, []);

  const setModel = useCallback((nextModel: string) => {
    setModelState(nextModel);
  }, []);

  const setPromptVariant = useCallback((nextVariant: string) => {
    persistPromptVariant(nextVariant);
    setPromptVariantState(nextVariant);
  }, []);

  // ── Stage-index + snap-scroll helpers ────────────────────────────────────

  const scrollToStage = useCallback((index: number) => {
    const doc = docRef.current;
    if (!doc) return;
    const stage = doc.querySelectorAll<HTMLElement>("[data-stage]")[index];
    if (stage) stage.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentStageIndex(index);
  }, []);

  const scrollToStageDelta = useCallback((delta: number) => {
    setCurrentStageIndex((prev) => {
      const next = prev + delta;
      const doc = docRef.current;
      if (doc) {
        const stage = doc.querySelectorAll<HTMLElement>("[data-stage]")[next];
        if (stage) stage.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  }, []);

  const updateAnswer = useCallback((stepId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
  }, []);

  const commitReveal = useCallback(
    async (language: Language) => {
      await submitQuestionnaire(answers, language);
    },
    [answers, submitQuestionnaire]
  );

  const takenChoicesAt = useCallback((_sceneDepth: number): string[] => {
    // Phase 5 will implement branching; linear path for now.
    return [];
  }, []);

  // Derived state (no extra React state required)
  const loading = {
    reveal: phase === "revealing" || phase === "directions-generating",
    scene: phase === "scene-generating",
  };
  const isCommitted = !!adventure?.committed;
  const bookshelfOpen = phase === "bookshelf";

  return {
    phase,
    loading,
    isCommitted,
    answers,
    currentStageIndex,
    bookshelfOpen,
    docRef,
    character,
    characterImageUrl,
    adventure,
    library,
    streamingText,
    error,
    dailyRemaining,
    dailyLimit,
    provider,
    model,
    promptVariant,
    availablePromptVariants,
    questionnaireSchema,
    fatedCharacter,
    revealReason,
    storyDirections,
    lastAnswers,
    hasSavedAdventure,
    updateAnswer,
    commitReveal,
    scrollToStage,
    scrollToStageDelta,
    takenChoicesAt,
    begin,
    openBookshelf,
    closeBookshelf,
    loadFromLibrary,
    submitQuestionnaire,
    pickDirection,
    goBackToQuestionnaire,
    enterWorld,
    chooseChoice,
    stopHere,
    startOver,
    resumeAdventure,
    setProvider,
    setModel,
    setPromptVariant,
  };
}