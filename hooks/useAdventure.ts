"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language, Message } from "@/types";
import {
  API_ROUTE,
  DEFAULT_PROVIDER,
  MAX_SCENES,
  PROVIDERS,
  REVEAL_MAX_TOKENS,
  SCENE_MAX_TOKENS,
} from "@/lib/constants";
import { clearAdventure, loadAdventure, saveAdventure, archiveToLibrary, loadLibrary } from "@/lib/teyvat/storage";
import {
  buildCandidatesPrompt,
  buildRevealPrompt,
  buildScenePrompt,
  parseCandidates,
  parseReveal,
  parseSceneStream,
  prefilterRoster,
  CANON_ROSTER,
  getCanonCharacter,
  type CanonCharacter,
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
import type { AdventureState, Scene } from "@/lib/teyvat/scenes";

export type AdventurePhase =
  | "idle"
  | "bookshelf"
  | "questionnaire"
  | "revealing"
  | "candidates-generating"
  | "candidate-pick"
  | "reveal-shown"
  | "scene-generating"
  | "scene-shown"
  | "ended";

export interface CandidateOption {
  character: CanonCharacter;
  hook: string;
  imageUrl: string | null;
}

export interface UseAdventureResult {
  phase: AdventurePhase;
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
  candidates: CandidateOption[] | null;
  hasSavedAdventure: boolean;
  begin(): void;
  openBookshelf(): void;
  closeBookshelf(): void;
  loadFromLibrary(id: string): boolean;
  submitQuestionnaire(answers: TeyvatAnswers, language: Language): Promise<void>;
  pickCandidate(id: string, language: Language): Promise<void>;
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
  const [candidates, setCandidates] = useState<CandidateOption[] | null>(null);
  const availablePromptVariants = listPromptVariants();
  const questionnaireSchema = getPromptVariant(promptVariant).capabilities.questionnaire;

  const refreshLibrary = useCallback(() => {
    setLibrary(loadLibrary());
  }, []);

  useEffect(() => {
    setHasSavedAdventure(Boolean(loadAdventure()));
    refreshLibrary();
    setPromptVariantState(resolvePromptVariant());
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

      const sceneNumber = currentAdventure.scenes.length + 1;
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
      const scene: Scene = {
        sceneNumber,
        text: parsed.text,
        choices: parsed.choices,
        closing: forcedClosing ? true : parsed.closing,
        summary: parsed.summary || `Scene ${sceneNumber} completed.`,
        fromChoice: previousChoice,
      };

      const nextAdventure: AdventureState = {
        ...currentAdventure,
        scenes: [...currentAdventure.scenes, scene],
        ended: forcedClosing ? true : parsed.closing,
        endedBy: forcedClosing || parsed.closing ? "model" : null,
      };

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

  const generateCandidatePortrait = useCallback(
    async (option: CandidateOption) => {
      try {
        const c = option.character;
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
          setCandidates((current) => {
            if (!current) return current;
            return current.map((existing) =>
              existing.character.id === c.id ? { ...existing, imageUrl: data.url ?? null } : existing
            );
          });
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

      const variant = getPromptVariant(promptVariant);

      if (variant.capabilities.reveal.kind === "candidates") {
        setPhase("candidates-generating");
        try {
          const prefiltered = prefilterRoster(CANON_ROSTER, answers);
          const allowedIds = new Set(prefiltered.map((c) => c.id));
          const prompt = buildCandidatesPrompt(answers, prefiltered, language);
          const firstRaw = await callJsonModel([{ role: "user", content: prompt }], REVEAL_MAX_TOKENS);
          let parsed = parseCandidates(firstRaw, allowedIds);

          if (!parsed.ok) {
            const errorList = parsed.errors.map((e) => `- ${e}`).join("\n");
            const retryPrompt = `${prompt}\n\nYour previous answer had these problems:\n${errorList}\n\nReturn valid JSON only, matching the schema exactly, with all problems above fixed.`;
            const retryRaw = await callJsonModel([{ role: "user", content: retryPrompt }], REVEAL_MAX_TOKENS);
            parsed = parseCandidates(retryRaw, allowedIds);
          }

          if (!parsed.ok) {
            throw new Error(parsed.errors.join(" | "));
          }

          const options: CandidateOption[] = parsed.candidates.map((entry) => {
            const character = getCanonCharacter(entry.id);
            return {
              character: character!,
              hook: entry.hook,
              imageUrl: null,
            };
          });
          setCandidates(options);
          setPhase("candidate-pick");

          for (const option of options) {
            void generateCandidatePortrait(option);
          }
          return;
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Candidate suggestion failed.");
          setPhase("questionnaire");
          return;
        }
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

        const nextAdventure: AdventureState = {
          id: generateId(),
          character: parsed.character,
          scenes: [],
          ended: false,
          endedBy: null,
          startedAt: new Date().toISOString(),
          variantId: promptVariant,
        };

        setCharacter(parsed.character);
        setAdventure(nextAdventure);
        saveAdventure(nextAdventure);
        setHasSavedAdventure(true);
        setPhase("reveal-shown");

        void generateCharacterImage(parsed.character);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Reveal failed.");
        setPhase("questionnaire");
      }
    },
    [callJsonModel, generateCharacterImage, generateCandidatePortrait, promptVariant]
  );

  const pickCandidate = useCallback(
    async (id: string, language: Language) => {
      if (!candidates) {
        return;
      }
      const option = candidates.find((o) => o.character.id === id);
      if (!option) {
        return;
      }

      const c = option.character;
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
        visionStory: option.hook,
        constellation: "—",
        signature: "—",
        knownAssociate: "",
        awakeningHook: option.hook,
      };

      const nextAdventure: AdventureState = {
        id: generateId(),
        character,
        scenes: [],
        ended: false,
        endedBy: null,
        startedAt: new Date().toISOString(),
        variantId: promptVariant,
      };

      setCharacter(character);
      setCharacterImageUrl(option.imageUrl);
      setAdventure(nextAdventure);
      saveAdventure(nextAdventure);
      setHasSavedAdventure(true);
      setCandidates(null);

      try {
        await generateScene(nextAdventure, "", language);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Scene generation failed.");
        setPhase("questionnaire");
      }
    },
    [candidates, generateScene, promptVariant]
  );

  const enterWorld = useCallback(
    async (language: Language) => {
      const currentAdventure =
        adventure ??
        (character
          ? {
              id: generateId(),
              character,
              scenes: [],
              ended: false,
              endedBy: null as "model" | "user" | null,
              startedAt: new Date().toISOString(),
            }
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
    [adventure, character, generateScene]
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
    if (current && current.scenes.length > 0) {
      archiveToLibrary(current);
    }
    clearAdventure();
    setCharacter(null);
    setCharacterImageUrl(null);
    setAdventure(null);
    setCandidates(null);
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
    if (current && current.scenes.length > 0 && current.id !== id) {
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
    } else if (entry.scenes.length > 0) {
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
    } else if (saved.scenes.length > 0) {
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

  return {
    phase,
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
    candidates,
    hasSavedAdventure,
    begin,
    openBookshelf,
    closeBookshelf,
    loadFromLibrary,
    submitQuestionnaire,
    pickCandidate,
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