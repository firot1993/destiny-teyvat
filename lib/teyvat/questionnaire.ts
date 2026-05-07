export interface LocalizedText {
  en: string;
  zh: string;
}

export type ChapterKey = "mood" | "desire" | "conflict" | "origin" | "power" | "desireWish";

export interface TeyvatOption {
  id: string;
  value: string;
  label: LocalizedText;
}

export interface TeyvatStep {
  id: string;
  chapter: ChapterKey;
  title: LocalizedText;
  mode: "single";
  options: TeyvatOption[];
}

export type TeyvatAnswers = Record<string, string>;

export interface QuestionnaireSchema {
  id: string;
  chapters: ChapterKey[];
  chapterMeta: Record<ChapterKey, { title: LocalizedText; subtitle: LocalizedText }>;
  steps: TeyvatStep[];
}

import { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

export { editorialQuestionnaire } from "@/lib/teyvat/questionnaires/editorialQuestionnaire";

// Backwards-compat surface — existing code (prompts.ts, promptVariants.ts,
// Questionnaire.tsx) imports these names. They now delegate to the editorial schema.
export const TEYVAT_STEPS = editorialQuestionnaire.steps;
export const CHAPTER_META = editorialQuestionnaire.chapterMeta;

export function isComplete(
  answers: TeyvatAnswers,
  schema: QuestionnaireSchema = editorialQuestionnaire
): boolean {
  return schema.steps.every((step) => Boolean(answers[step.id]));
}
