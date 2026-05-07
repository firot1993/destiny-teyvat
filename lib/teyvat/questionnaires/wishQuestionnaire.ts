import type {
  ChapterKey,
  LocalizedText,
  QuestionnaireSchema,
  TeyvatOption,
  TeyvatStep,
} from "@/lib/teyvat/questionnaire";

const CHAPTER_META: Record<ChapterKey, { title: LocalizedText; subtitle: LocalizedText }> = {
  origin: {
    title: { en: "Origin", zh: "出身" },
    subtitle: {
      en: "What you bring with you from the world that will be left behind.",
      zh: "你将带着哪些东西，离开那个即将被抛在身后的世界。",
    },
  },
  power: {
    title: { en: "Power", zh: "力量" },
    subtitle: {
      en: "The shape that overwhelming takes when it finally belongs to you.",
      zh: "当压倒性的力量真正归你所有，它会是怎样的形状。",
    },
  },
  desireWish: {
    title: { en: "Desire", zh: "渴望" },
    subtitle: {
      en: "What victory would have to look like for you to finally rest.",
      zh: "胜利要长成什么样子，才能让你真正放下。",
    },
  },
  // Editorial chapters declared so the union is total; unused by the wish schema.
  mood: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  desire: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
  conflict: { title: { en: "", zh: "" }, subtitle: { en: "", zh: "" } },
};

function opt(id: string, value: string, en: string, zh: string): TeyvatOption {
  return { id, value, label: { en, zh } };
}

const STEPS: TeyvatStep[] = [
  {
    id: "escape",
    chapter: "origin",
    title: {
      en: "What pulled you toward another world?",
      zh: "是什么把你从原来的世界拉走？",
    },
    mode: "single",
    options: [
      opt("escape-1", "burnout", "the exhaustion that never left", "怎么也散不去的疲惫"),
      opt("escape-2", "heartbreak", "a wound that wouldn't close", "一道始终没合上的伤口"),
      opt("escape-3", "boredom", "days that all looked the same", "每一天都长得一样"),
      opt("escape-4", "injustice", "a world that wouldn't make it right", "一个不肯还你公道的世界"),
    ],
  },
  {
    id: "denied",
    chapter: "origin",
    title: {
      en: "What did the old world refuse you?",
      zh: "原来的世界拒绝给你什么？",
    },
    mode: "single",
    options: [
      opt("denied-1", "respect", "respect you had earned but never received", "你挣来过却从没得到的尊重"),
      opt("denied-2", "power", "any real power to change anything", "任何足以改变一切的真正力量"),
      opt("denied-3", "love", "love you could trust", "可以信赖的爱"),
      opt("denied-4", "freedom", "freedom from someone else's plan for you", "脱离别人为你安排好的轨道的自由"),
    ],
  },
  {
    id: "dominance",
    chapter: "power",
    title: {
      en: "What kind of overwhelming feels best?",
      zh: "怎样的压倒性最让你称心？",
    },
    mode: "single",
    options: [
      opt("dominance-1", "martial", "martial — no one stands in front of you", "武：没有人能挡在你面前"),
      opt("dominance-2", "political", "political — you decide who rises and who falls", "权：你决定谁起谁落"),
      opt("dominance-3", "intellectual", "intellectual — you see the whole board", "智：整盘棋你尽收眼底"),
      opt("dominance-4", "divine", "divine — the rules of the world bend around you", "神：世界的规则因你而弯"),
    ],
  },
  {
    id: "pace",
    chapter: "power",
    title: {
      en: "How fast should the rise be?",
      zh: "崛起应该有多快？",
    },
    mode: "single",
    options: [
      opt("pace-1", "instant", "you wake already at the top", "你醒来时就站在顶端"),
      opt("pace-2", "earned", "earned through escalating wins", "在一场场胜利中逐步登顶"),
      opt("pace-3", "patient", "patient — every move part of a longer plan", "沉得住气：每一步都是更长远计划的一部分"),
      opt("pace-4", "explosive", "explosive — slow build, then a single decisive break", "蓄势良久，最后一击雷霆万钧"),
    ],
  },
  {
    id: "humble",
    chapter: "desireWish",
    title: {
      en: "Who most deserves to be humbled?",
      zh: "谁最该被你折服？",
    },
    mode: "single",
    options: [
      opt("humble-1", "scorners", "those who scorned you when you were nothing", "那些在你一无所有时轻视你的人"),
      opt("humble-2", "rival-faction", "a rival faction that thought it ruled", "自以为掌权的对立势力"),
      opt("humble-3", "heavens", "the heavens themselves", "苍天本身"),
      opt("humble-4", "live-well", "no one — you'd rather just live well", "都不必：你只想好好过日子"),
    ],
  },
  {
    id: "reward",
    chapter: "desireWish",
    title: {
      en: "What reward is worth fighting for?",
      zh: "什么样的回报值得你去争？",
    },
    mode: "single",
    options: [
      opt("reward-1", "recognition", "recognition that lasts past your death", "你死之后仍能延续的声名"),
      opt("reward-2", "companions", "companions and bonds that hold", "靠得住的同伴与羁绊"),
      opt("reward-3", "wealth", "wealth and territory", "财富与疆土"),
      opt("reward-4", "transcendence", "transcendence — to step beyond the rules entirely", "超脱：彻底跳出规则之外"),
    ],
  },
  {
    id: "affinity",
    chapter: "desireWish",
    title: {
      en: "What aesthetic calls to you?",
      zh: "哪一种气质最召唤你？",
    },
    mode: "single",
    options: [
      opt("affinity-electro", "electro", "thunder and steel", "雷与刃"),
      opt("affinity-geo", "geo", "stone and gold", "石与金"),
      opt("affinity-pyro", "pyro", "flame and fragrance", "火与香"),
      opt("affinity-cryo", "cryo", "frost and silence", "霜与寂"),
      opt("affinity-anemo", "anemo", "wind and song", "风与歌"),
      opt("affinity-hydro", "hydro", "water and starlight", "水与星光"),
      opt("affinity-dendro", "dendro", "dendro and verse", "草木与诗"),
    ],
  },
];

export const wishQuestionnaire: QuestionnaireSchema = {
  id: "wish",
  chapters: ["origin", "power", "desireWish"],
  chapterMeta: CHAPTER_META,
  steps: STEPS,
};
