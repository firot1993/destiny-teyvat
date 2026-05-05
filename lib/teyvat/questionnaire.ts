export interface LocalizedText {
  en: string;
  zh: string;
}

export type ChapterKey = "mood" | "desire" | "conflict";

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

export const CHAPTER_META: Record<
  ChapterKey,
  { title: LocalizedText; subtitle: LocalizedText }
> = {
  mood: {
    title: { en: "Mood", zh: "心境" },
    subtitle: {
      en: "The air around you speaks before the world does.",
      zh: "世界尚未开口之前，周围的气息已经先说了话。",
    },
  },
  desire: {
    title: { en: "Desire", zh: "欲望" },
    subtitle: {
      en: "Want reveals its shape through what it would risk.",
      zh: "欲望真正的形状，藏在它愿意付出的代价里。",
    },
  },
  conflict: {
    title: { en: "Conflict", zh: "冲突" },
    subtitle: {
      en: "The road narrows where choice begins to cost you.",
      zh: "当选择开始要你付出代价，路也就变窄了。",
    },
  },
};

function opt(id: string, value: string, en: string, zh: string): TeyvatOption {
  return { id, value, label: { en, zh } };
}

export const TEYVAT_STEPS: TeyvatStep[] = [
  {
    id: "wakeNotice",
    chapter: "mood",
    title: {
      en: "You wake somewhere you don't recognize. What's the first thing you notice?",
      zh: "你在一个陌生的地方醒来。你最先注意到什么？",
    },
    mode: "single",
    options: [
      opt("wakeNotice-1", "the silence that isn't empty", "the silence that isn't empty", "并不空洞的寂静"),
      opt("wakeNotice-2", "a smell of rain on warm stone", "a smell of rain on warm stone", "暖石上将雨未雨的气味"),
      opt("wakeNotice-3", "distant voices speaking a language you almost know", "distant voices speaking a language you almost know", "远处有人在说一种你几乎听得懂的语言"),
      opt("wakeNotice-4", "something glowing at the edge of your vision", "something glowing at the edge of your vision", "视野边缘有什么东西在发光"),
    ],
  },
  {
    id: "weather",
    chapter: "mood",
    title: {
      en: "The weather you'd choose to walk in for hours:",
      zh: "如果要在外走上几个小时，你会选怎样的天气？",
    },
    mode: "single",
    options: [
      opt("weather-1", "thin cold air after a snowfall", "thin cold air after a snowfall", "雪后稀薄而清冽的空气"),
      opt("weather-2", "midday heat with no shade", "midday heat with no shade", "正午烈日，没有一丝阴影"),
      opt("weather-3", "a storm that hasn't broken yet", "a storm that hasn't broken yet", "尚未落下的暴风雨"),
      opt("weather-4", "mist that hides whatever is ahead", "mist that hides whatever is ahead", "遮住前路的雾气"),
    ],
  },
  {
    id: "trade",
    chapter: "desire",
    title: {
      en: "What would you trade almost anything for?",
      zh: "有什么是你几乎愿意拿一切去换的？",
    },
    mode: "single",
    options: [
      opt("trade-1", "to be remembered for one true thing", "to be remembered for one true thing", "因一件真正的事被人记住"),
      opt("trade-2", "to disappear cleanly and start over", "to disappear cleanly and start over", "干干净净地消失，然后重新开始"),
      opt("trade-3", "to know something no one else knows", "to know something no one else knows", "知道一件别人都不知道的事"),
      opt("trade-4", "to keep one person safe, no matter what", "to keep one person safe, no matter what", "无论如何都能护住一个人"),
    ],
  },
  {
    id: "mark",
    chapter: "desire",
    title: {
      en: "The kind of mark you'd want to leave:",
      zh: "你想留下怎样的痕迹？",
    },
    mode: "single",
    options: [
      opt("mark-1", "a craft so good people pass it down", "a craft so good people pass it down", "手艺好到会被一代代传下去"),
      opt("mark-2", "a question that outlives you", "a question that outlives you", "一个比你活得更久的问题"),
      opt("mark-3", "a place that's safer because you were there", "a place that's safer because you were there", "因为你来过，所以那里更安全"),
      opt("mark-4", "nothing — you'd rather pass through", "nothing — you'd rather pass through", "什么都不留下，你更愿意只是经过"),
    ],
  },
  {
    id: "power",
    chapter: "desire",
    title: {
      en: "When you imagine being powerful, the power looks like:",
      zh: "当你想象自己拥有力量时，那力量更像是：",
    },
    mode: "single",
    options: [
      opt("power-1", "precision — doing one thing perfectly", "precision — doing one thing perfectly", "精确：把一件事做到完美"),
      opt("power-2", "influence — people listening when you speak", "influence — people listening when you speak", "影响力：你开口时，人们会听"),
      opt("power-3", "knowledge — seeing what others miss", "knowledge — seeing what others miss", "知识：看见别人忽略的东西"),
      opt("power-4", "protection — standing between harm and someone you love", "protection — standing between harm and someone you love", "守护：站在伤害与你所爱之人之间"),
    ],
  },
  {
    id: "fork",
    chapter: "conflict",
    title: {
      en: "The road splits. Which pull do you trust?",
      zh: "道路分岔了。你更相信哪一种牵引？",
    },
    mode: "single",
    options: [
      opt("fork-1", "the harder climb", "the harder climb", "更难攀的那条路"),
      opt("fork-2", "the quieter road", "the quieter road", "更安静的那条路"),
      opt("fork-3", "the one with company", "the one with company", "有人同行的那条路"),
      opt("fork-4", "the one no one's taken", "the one no one's taken", "从没人走过的那条路"),
    ],
  },
  {
    id: "break",
    chapter: "conflict",
    title: {
      en: "When something inside you finally breaks open, it sounds like:",
      zh: "当你心里有什么终于裂开时，那声音更像是：",
    },
    mode: "single",
    options: [
      opt("break-1", "a long-held breath let out", "a long-held breath let out", "一口憋了很久的气终于吐出来"),
      opt("break-2", "a blade drawn slowly", "a blade drawn slowly", "一把刀被缓缓抽出"),
      opt("break-3", "laughter you didn't expect", "laughter you didn't expect", "你没想到自己会发出的笑声"),
      opt("break-4", "silence — the kind that means you've decided", "silence — the kind that means you've decided", "沉默，那种意味着你已经决定的沉默"),
    ],
  },
];

export function isComplete(answers: TeyvatAnswers): boolean {
  return TEYVAT_STEPS.every((step) => Boolean(answers[step.id]));
}