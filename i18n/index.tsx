"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Language } from "@/types";

type TranslationVars = Record<string, string>;

const translations: Record<string, Record<string, string>> = {
  en: {
    app_title: "Drift Through Teyvat",
    app_tagline: "A short adventure in Teyvat, written for you.",
    begin: "Begin",
    resume: "Resume",
    next: "Next",
    previous: "Previous",
    back: "Back",
    back_to_title: "Back to title",
    back_to_questions: "Back to questions",
    settings: "Settings",
    provider_label: "Provider",
    model_label: "Model",
    prompt_variant_label: "Prompt variant",
    listening_for_name: "Listening for your name…",
    walk_into_world: "Walk into the world →",
    day_vision_answered: "The day your Vision answered.",
    travel_with: "You travel with:",
    scene_label: "Scene",
    see_earlier_scenes: "See earlier scenes",
    stop_here: "stop here",
    adventure_log: "Adventure Log",
    close: "Close",
    their_story_pauses: "Their story pauses here.",
    their_story_ends: "Their story ends here.",
    read_again_from_start: "Read it again from the start",
    walk_different_path: "Walk a different path",
    quota_low: "adventures left today",
    bookshelf: "Bookshelf",
    stories_tab: "Stories",
    characters_tab: "Characters",
    no_stories_yet: "No stories yet. Begin your first adventure.",
    no_characters_yet: "No characters yet.",
    unfinished: "Unfinished",
    paused: "Paused",
    completed: "Completed",
    continue_story: "Continue",
    read_again: "Read again",
    adventure_singular: "adventure",
    adventure_plural: "adventures",
    show_more: "Show more",
    show_less: "Show less",
    view_adventure: "View adventure",
    open_bookshelf: "Bookshelf",
    choose_your_destiny: "Choose Your Destiny",
    fated_eyebrow: "Your fated awakening",
    why_this_one: "Why this one",
    choose_a_direction: "Choose your opening",
    direction_pick_hint: "Three stories are waiting. Pick the one that feels closest to the life you'd live.",
    walk_this_path: "Walk this path →",
    reveal_loading_copy: "the wind is listening…",
    reveal_commit_prompt: "The stars have read your answers. Are you ready to learn your fate?",
    reveal_commit_cta: "Reveal my destiny",
    reveal_opening_path: "Opening the path...",
    reveal_walk_into_world: "Walk into {{possessive}} world ↓",
    reveal_world_possessive_he: "his",
    reveal_world_possessive_she: "her",
    reveal_world_possessive_they: "their",
    filter_all: "All",
    filter_editorial: "Editorial",
    filter_wish: "Wish-fulfillment",
    filter_other: "Other",
  },

  zh: {
    app_title: "漂流到提瓦特",
    app_tagline: "一段只写给你的提瓦特短篇冒险。",
    begin: "开始",
    resume: "继续上一次",
    next: "继续",
    previous: "上一题",
    back: "返回",
    back_to_title: "返回标题",
    back_to_questions: "返回问卷",
    settings: "设置",
    provider_label: "提供商",
    model_label: "模型",
    prompt_variant_label: "Prompt 变体",
    listening_for_name: "正在倾听你的名字……",
    walk_into_world: "走入世界 →",
    day_vision_answered: "神之眼回应你的那一天。",
    travel_with: "与你同行的是：",
    scene_label: "场景",
    see_earlier_scenes: "查看之前的场景",
    stop_here: "停在这里",
    adventure_log: "冒险记录",
    close: "关闭",
    their_story_pauses: "他们的故事暂时停在这里。",
    their_story_ends: "他们的故事在这里结束。",
    read_again_from_start: "从头再读一遍",
    walk_different_path: "走一条不同的路",
    quota_low: "今日剩余冒险次数",
    bookshelf: "书架",
    stories_tab: "故事",
    characters_tab: "角色",
    no_stories_yet: "还没有故事。开始你的第一次冒险吧。",
    no_characters_yet: "还没有角色。",
    unfinished: "未完成",
    paused: "已暂停",
    completed: "已完成",
    continue_story: "继续",
    read_again: "再读一遍",
    adventure_singular: "次冒险",
    adventure_plural: "次冒险",
    show_more: "展开",
    show_less: "收起",
    view_adventure: "查看冒险",
    open_bookshelf: "书架",
    choose_your_destiny: "择命",
    fated_eyebrow: "命定觉醒",
    why_this_one: "为何是这一位",
    choose_a_direction: "选择你的开端",
    direction_pick_hint: "三种命途已在等候。选那一种最像你愿意去过的人生。",
    walk_this_path: "走上这条路 →",
    reveal_loading_copy: "风在聆听…",
    reveal_commit_prompt: "星辰已读懂你的答案。你准备好迎接你的命运了吗？",
    reveal_commit_cta: "揭示我的命运",
    reveal_opening_path: "正在打开前路...",
    reveal_walk_into_world: "走入{{possessive}}世界 ↓",
    reveal_world_possessive_he: "他的",
    reveal_world_possessive_she: "她的",
    reveal_world_possessive_they: "他们的",
    filter_all: "全部",
    filter_editorial: "正传",
    filter_wish: "爽文",
    filter_other: "其他",
  },
};

interface I18nContextValue {
  lang: Language;
  t: (key: string, vars?: TranslationVars) => string;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const INTERPOLATION_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) {
    return template;
  }
  return template.replace(INTERPOLATION_PATTERN, (match, token) => vars[token] ?? match);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("zh");

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get("lang");
    if (saved && translations[saved]) {
      setLang(saved as Language);
      return;
    }
    const browserLang = navigator.language || "zh";
    setLang(browserLang.startsWith("en") ? "en" : "zh");
  }, []);

  const t = useCallback(
    (key: string, vars?: TranslationVars) => {
      const raw = translations[lang]?.[key] ?? translations["zh"]?.[key] ?? key;
      return interpolate(raw, vars);
    },
    [lang]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((l) => (l === "en" ? "zh" : "en"));
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
