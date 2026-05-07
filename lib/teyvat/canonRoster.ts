import type { LocalizedText } from "@/lib/teyvat/questionnaire";
import type { Nation, Vision, Weapon } from "@/lib/teyvat/elements";

export type Dominance = "martial" | "political" | "intellectual" | "divine";
export type Pace = "instant" | "earned" | "patient" | "explosive";
export type HumbleTarget = "scorners" | "rival-faction" | "heavens" | "live-well";
export type Reward = "recognition" | "companions" | "wealth" | "transcendence";

export interface CanonCharacter {
  id: string;
  nameEn: string;
  nameZh: string;
  vision: Vision;
  nation: Nation;
  weapon: Weapon;
  archetypeTags: string[];
  archetypeBlurb: LocalizedText;
  bioBlurb: LocalizedText;
  powerFantasyAxes: {
    dominance: Dominance[];
    pace: Pace[];
    humbleTargets: HumbleTarget[];
    rewards: Reward[];
  };
}

export const CANON_ROSTER: CanonCharacter[] = [
  {
    id: "raiden-shogun",
    nameEn: "Raiden Shogun",
    nameZh: "雷电将军",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "polearm",
    archetypeTags: ["divine", "ruler", "isolated", "martial"],
    archetypeBlurb: {
      en: "The Electro Archon. Eternity given a body and a blade.",
      zh: "雷电之神。化作肉身与刀的「永恒」。",
    },
    bioBlurb: {
      en: "Ruler of Inazuma, vessel of Ei, wielder of the Musou no Hitotachi. Her court is silent because she does not need to raise her voice.",
      zh: "稻妻之主，影的容器，无想之一刀的执剑者。她的朝堂沉默，因为她从不需要提高声音。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "martial", "political"],
      pace: ["instant", "patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "zhongli",
    nameEn: "Zhongli",
    nameZh: "钟离",
    vision: "Geo",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["divine", "patient", "scholar", "retired"],
    archetypeBlurb: {
      en: "Morax in retirement. The contract-keeper who shaped a nation.",
      zh: "退位的岩王帝君。一手立下契约、塑造璃月的旧神。",
    },
    bioBlurb: {
      en: "Six millennia of memory wear his mortal coat lightly. He drinks tea, attends funerals, and lets the ground decide.",
      zh: "六千年记忆披在他凡人的外衣下毫不沉重。他饮茶，吊丧，把判决留给大地。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "intellectual", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "venti",
    nameEn: "Venti",
    nameZh: "温迪",
    vision: "Anemo",
    nation: "Mondstadt",
    weapon: "bow",
    archetypeTags: ["divine", "trickster", "bard", "free"],
    archetypeBlurb: {
      en: "Barbatos in a tavern. Freedom that refuses to wear a crown.",
      zh: "酒馆里的巴巴托斯。不肯戴上王冠的自由。",
    },
    bioBlurb: {
      en: "The Anemo Archon walks Mondstadt as a wandering bard. He sings songs older than the city and forgets which centuries he wrote them in.",
      zh: "风神在蒙德以游吟诗人的身份行走。他唱比城市更古老的歌，忘了自己是在哪个世纪写下的。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "intellectual"],
      pace: ["patient", "explosive"],
      humbleTargets: ["live-well", "heavens"],
      rewards: ["companions", "transcendence"],
    },
  },
  {
    id: "nahida",
    nameEn: "Nahida",
    nameZh: "纳西妲",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "catalyst",
    archetypeTags: ["divine", "scholar", "child", "wisdom"],
    archetypeBlurb: {
      en: "The Dendro Archon. Wisdom in a small body, mercy in a large one.",
      zh: "草神。小小身体里的智慧，巨大身体里的怜悯。",
    },
    bioBlurb: {
      en: "Born only five centuries ago and already older in patience than nations. She sees thoughts the way others see weather.",
      zh: "五百年前才诞生，却比许多国度更耐心地古老。她看人的念头，像别人看天气一样。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "divine"],
      pace: ["earned", "patient"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "yae-miko",
    nameEn: "Yae Miko",
    nameZh: "八重神子",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "catalyst",
    archetypeTags: ["scheming", "ageless", "priestess", "patient"],
    archetypeBlurb: {
      en: "The Guuji of the Grand Narukami Shrine. A fox who finds amusement in centuries.",
      zh: "鸣神大社的宫司大人。一只在世纪中自寻乐趣的狐狸。",
    },
    bioBlurb: {
      en: "She runs a publishing house, advises a Shogun, and laughs at most things. The smile is part of the strategy.",
      zh: "她经营着出版社，辅佐着将军，对大多数事物报以笑意。笑意本身也是计谋的一部分。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "political", "divine"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "hu-tao",
    nameEn: "Hu Tao",
    nameZh: "胡桃",
    vision: "Pyro",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["mortal", "trickster", "spirited", "balanced"],
    archetypeBlurb: {
      en: "77th Director of Wangsheng Funeral Parlor. The line between life and death runs through her ledgers.",
      zh: "往生堂第七十七代堂主。生死之间那条线，正穿过她的账本。",
    },
    bioBlurb: {
      en: "She walks both yang and yin with equal levity. The dead are her clients; the living are her targets for jokes.",
      zh: "她以同样的轻盈走过阴阳两端。亡者是她的主顾，生者是她调侃的目标。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners", "live-well"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "kamisato-ayaka",
    nameEn: "Kamisato Ayaka",
    nameZh: "神里绫华",
    vision: "Cryo",
    nation: "Inazuma",
    weapon: "sword",
    archetypeTags: ["noble", "disciplined", "graceful", "earned"],
    archetypeBlurb: {
      en: "Shirasagi Himegimi of the Kamisato clan. Discipline as a kind of beauty.",
      zh: "神里家的白鹭氷华。把克己练成了一种美。",
    },
    bioBlurb: {
      en: "She bears the weight of a noble house with practiced ease. Behind every gracious bow is a winter blade.",
      zh: "她以娴熟的轻盈承担着名门的重量。每一记温雅的礼后都藏着一柄寒冬之刃。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "patient"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "tartaglia",
    nameEn: "Tartaglia",
    nameZh: "达达利亚",
    vision: "Hydro",
    nation: "Snezhnaya",
    weapon: "bow",
    archetypeTags: ["martial", "warrior", "explosive", "outsider"],
    archetypeBlurb: {
      en: "Eleventh of the Fatui Harbingers. The fight is the point.",
      zh: "「公子」，愚人众第十一席。打架本身就是目的。",
    },
    bioBlurb: {
      en: "Childe walked into the Abyss as a boy and walked back out hungry. He keeps moving because standing still hurts more.",
      zh: "他在少年时走入深渊，再走出时已不知餍足。他不停下，因为停下更难捱。",
    },
    powerFantasyAxes: {
      dominance: ["martial"],
      pace: ["instant", "explosive"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "ganyu",
    nameEn: "Ganyu",
    nameZh: "甘雨",
    vision: "Cryo",
    nation: "Liyue",
    weapon: "bow",
    archetypeTags: ["loyal", "patient", "half-adeptus", "scholar"],
    archetypeBlurb: {
      en: "Secretary of the Liyue Qixing. Three thousand years of meeting minutes.",
      zh: "璃月七星的秘书。三千年的会议记录。",
    },
    bioBlurb: {
      en: "She inherited the patience of qilin and the workload of a city. Both fit her better than they should.",
      zh: "她继承了麒麟的耐心，也接下了一座城邦的工作。两者都比理应的更合身。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["patient", "earned"],
      humbleTargets: ["live-well", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "diluc",
    nameEn: "Diluc",
    nameZh: "迪卢克",
    vision: "Pyro",
    nation: "Mondstadt",
    weapon: "claymore",
    archetypeTags: ["wealth", "vigilante", "earned", "isolated"],
    archetypeBlurb: {
      en: "Tycoon of Dawn Winery. Mondstadt's unsigned protector.",
      zh: "晨曦酒庄的庄主。蒙德没有署名的守护者。",
    },
    bioBlurb: {
      en: "He owns more vineyards than any noble and walks more rooftops than any knight. Both shifts are unpaid.",
      zh: "他拥有的葡萄园比任何贵族都多，踏过的屋脊比任何骑士都广。两份工作都没有薪水。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "explosive"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["wealth", "recognition"],
    },
  },
  {
    id: "albedo",
    nameEn: "Albedo",
    nameZh: "阿贝多",
    vision: "Geo",
    nation: "Mondstadt",
    weapon: "sword",
    archetypeTags: ["scholar", "alchemist", "patient", "outsider"],
    archetypeBlurb: {
      en: "Chief Alchemist of the Knights of Favonius. The Kreideprinz with quiet eyes.",
      zh: "西风骑士团首席炼金术士。眼神安静的「白垩之子」。",
    },
    bioBlurb: {
      en: "He treats people like experiments worth respecting. He sketches what he loves and erases what he doesn't.",
      zh: "他把人当作值得尊重的实验对象。他写生所爱，擦掉余者。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["transcendence", "recognition"],
    },
  },
  {
    id: "xiao",
    nameEn: "Xiao",
    nameZh: "魈",
    vision: "Anemo",
    nation: "Liyue",
    weapon: "polearm",
    archetypeTags: ["adeptus", "haunted", "martial", "isolated"],
    archetypeBlurb: {
      en: "Yaksha of the Liyue adepti. Karmic debt walking on a polearm's edge.",
      zh: "璃月仙众中的夜叉。一柄长枪刃上行走的业债。",
    },
    bioBlurb: {
      en: "He has hunted demons for two millennia and is part of the bill himself. Solitude is mercy he gives others.",
      zh: "他斩了两千年妖魔，自己也写在那份账上。独处是他对旁人的仁慈。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "divine"],
      pace: ["instant", "explosive"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "wanderer",
    nameEn: "Wanderer",
    nameZh: "流浪者",
    vision: "Anemo",
    nation: "wandering",
    weapon: "catalyst",
    archetypeTags: ["outsider", "former-divine", "scornful", "intelligent"],
    archetypeBlurb: {
      en: "Former Balladeer, former Harbinger, currently nothing. Memory edited, hatred kept.",
      zh: "曾经的「散兵」，曾经的执行官，如今谁也不是。记忆被改写，恨意还留着。",
    },
    bioBlurb: {
      en: "He has been a puppet, a weapon, a god, and a footnote. He is determined to be the next thing on his own terms.",
      zh: "他曾是傀儡，是武器，是神，也是注脚。下一种身份，他打算自己定。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual", "divine"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners", "heavens"],
      rewards: ["recognition", "transcendence"],
    },
  },
  {
    id: "furina",
    nameEn: "Furina",
    nameZh: "芙宁娜",
    vision: "Hydro",
    nation: "Fontaine",
    weapon: "sword",
    archetypeTags: ["divine", "performer", "lonely", "earned"],
    archetypeBlurb: {
      en: "Once Hydro Archon, now Hydro hostess. Five hundred years of an act that finally ended.",
      zh: "曾经的水神，如今的水都名媛。一场演了五百年、终于落幕的戏。",
    },
    bioBlurb: {
      en: "She held a stage and a covenant alone. The applause was real even when nothing else was.",
      zh: "她独自撑起一座舞台，也撑起一纸盟约。即便其他一切是假，掌声是真的。",
    },
    powerFantasyAxes: {
      dominance: ["political", "divine"],
      pace: ["patient", "earned"],
      humbleTargets: ["scorners", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "neuvillette",
    nameEn: "Neuvillette",
    nameZh: "那维莱特",
    vision: "Hydro",
    nation: "Fontaine",
    weapon: "catalyst",
    archetypeTags: ["judge", "patient", "dragon", "lawful"],
    archetypeBlurb: {
      en: "Iudex of Fontaine. The Hydro Sovereign in a courtroom.",
      zh: "枫丹的最高审判官。法庭中的水龙王。",
    },
    bioBlurb: {
      en: "He weighs guilt the way the sea weighs stones. The law speaks through him because he is older than the law.",
      zh: "他衡量罪责，如同海衡量石。法藉他而言，因他比法更古老。",
    },
    powerFantasyAxes: {
      dominance: ["political", "divine", "intellectual"],
      pace: ["patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["recognition", "transcendence"],
    },
  },
  {
    id: "arlecchino",
    nameEn: "Arlecchino",
    nameZh: "阿蕾奇诺",
    vision: "Pyro",
    nation: "Snezhnaya",
    weapon: "polearm",
    archetypeTags: ["scheming", "ruthless", "matriarch", "earned"],
    archetypeBlurb: {
      en: "Fourth of the Fatui Harbingers. The House of the Hearth raises children and burns rivals.",
      zh: "愚人众第四席。炉之家既养孩子，也烧仇敌。",
    },
    bioBlurb: {
      en: "She runs an orphanage and a knife both with care. The knife is for whoever threatens the orphanage.",
      zh: "孤儿院与利刃她都用心经营。刀，是留给威胁那所孤儿院的人的。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["wealth", "companions"],
    },
  },
  {
    id: "ningguang",
    nameEn: "Ningguang",
    nameZh: "凝光",
    vision: "Geo",
    nation: "Liyue",
    weapon: "catalyst",
    archetypeTags: ["wealth", "political", "self-made", "patient"],
    archetypeBlurb: {
      en: "Tianquan of the Liyue Qixing. The Jade Chamber casts long shadows.",
      zh: "璃月七星之天权。群玉阁投下的影子很长。",
    },
    bioBlurb: {
      en: "She rose from nothing and built a floating palace to remember it by. Information is the currency she trades in best.",
      zh: "她从一无所有起家，建起一座浮空宫殿作纪念。她最擅长的货币，是情报。",
    },
    powerFantasyAxes: {
      dominance: ["political", "intellectual"],
      pace: ["earned", "patient"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["wealth", "recognition"],
    },
  },
  {
    id: "kazuha",
    nameEn: "Kaedehara Kazuha",
    nameZh: "枫原万叶",
    vision: "Anemo",
    nation: "Inazuma",
    weapon: "sword",
    archetypeTags: ["wandering", "poet", "swift", "free"],
    archetypeBlurb: {
      en: "An exiled samurai of the Kaedehara line. The wind keeps his promises for him.",
      zh: "枫原家的流亡武士。风替他守着承诺。",
    },
    bioBlurb: {
      en: "He carries a friend's sword and a friend's grief. He travels light because he refuses to lay either down.",
      zh: "他带着一位友人的刀，也带着同一位友人的悲伤。他行旅至简——这两样都不肯放下。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "intellectual"],
      pace: ["earned", "explosive"],
      humbleTargets: ["live-well", "scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "alhaitham",
    nameEn: "Alhaitham",
    nameZh: "艾尔海森",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "sword",
    archetypeTags: ["scholar", "blunt", "intellectual", "patient"],
    archetypeBlurb: {
      en: "Acting Grand Sage of the Akademiya. Reason walks beside him with a sword.",
      zh: "教令院代理大贤者。理性带着一柄剑陪在他身边。",
    },
    bioBlurb: {
      en: "He treats power as a tool to put down once the work is done. Most people don't believe him until he does.",
      zh: "他把权力当作做完事就该放下的工具。多数人直到他真的放下，才相信他说真的。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "political"],
      pace: ["patient", "earned"],
      humbleTargets: ["rival-faction", "scorners"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "ei",
    nameEn: "Ei",
    nameZh: "影",
    vision: "Electro",
    nation: "Inazuma",
    weapon: "polearm",
    archetypeTags: ["divine", "guarded", "introspective", "warrior"],
    archetypeBlurb: {
      en: "Beelzebul of Baal's pact. The Archon behind the Shogun.",
      zh: "拜尔之契中的雷电真君。将军背后的真神。",
    },
    bioBlurb: {
      en: "She kept herself in a Plane of Euthymia for centuries to keep her promise to her sister. The world had to wait.",
      zh: "她为守对妹妹的承诺，把自己锁在「一心净土」数百年。世界只好等。",
    },
    powerFantasyAxes: {
      dominance: ["divine", "martial"],
      pace: ["instant", "patient"],
      humbleTargets: ["heavens", "rival-faction"],
      rewards: ["transcendence", "companions"],
    },
  },
  {
    id: "mavuika",
    nameEn: "Mavuika",
    nameZh: "玛薇卡",
    vision: "Pyro",
    nation: "Natlan",
    weapon: "claymore",
    archetypeTags: ["divine", "leader", "fiery", "earned"],
    archetypeBlurb: {
      en: "Pyro Archon of Natlan. War leader who rides the fire in front of her people.",
      zh: "纳塔的火神。战时领袖，带头冲在火前。",
    },
    bioBlurb: {
      en: "She does not stand on a dais. Her authority is the kind people walk into combat behind.",
      zh: "她不立于高台。她的威望是众人愿跟在身后冲锋的那种。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "divine", "political"],
      pace: ["explosive", "instant"],
      humbleTargets: ["rival-faction", "heavens"],
      rewards: ["recognition", "companions"],
    },
  },
  {
    id: "cyno",
    nameEn: "Cyno",
    nameZh: "赛诺",
    vision: "Electro",
    nation: "Sumeru",
    weapon: "polearm",
    archetypeTags: ["judge", "stern", "ancient-mask", "patient"],
    archetypeBlurb: {
      en: "General Mahamatra of the Akademiya. The mask of the jackal-headed god rests near him.",
      zh: "教令院总大慈树王下的「大风纪官」。胡狼头之神的面具就放在他手边。",
    },
    bioBlurb: {
      en: "He hunts academic crime with the patience of a desert. He tells terrible jokes with the patience of someone who knows they're terrible.",
      zh: "他以沙漠的耐心追查学术之罪。他说着糟糕的笑话，带着「我知道糟，但我说定了」的耐心。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["patient", "explosive"],
      humbleTargets: ["rival-faction"],
      rewards: ["recognition"],
    },
  },
  {
    id: "tighnari",
    nameEn: "Tighnari",
    nameZh: "提纳里",
    vision: "Dendro",
    nation: "Sumeru",
    weapon: "bow",
    archetypeTags: ["scholar", "ranger", "patient", "ethical"],
    archetypeBlurb: {
      en: "Forest Watcher of Avidya. He prefers the trees to most people, and they prefer him.",
      zh: "觉王的森林管理者。他更喜欢树木胜过多数人，树木也更喜欢他。",
    },
    bioBlurb: {
      en: "He marks every misstep in the forest and remembers each one. The forest pays him back in safety.",
      zh: "他记下林中每一处疏失，且一一记得。森林以安宁回报他。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["patient"],
      humbleTargets: ["live-well", "scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "lyney",
    nameEn: "Lyney",
    nameZh: "林尼",
    vision: "Pyro",
    nation: "Fontaine",
    weapon: "bow",
    archetypeTags: ["performer", "trickster", "earned", "loyal"],
    archetypeBlurb: {
      en: "Magician of the House of the Hearth. Every trick is a kindness misdirected.",
      zh: "炉之家的魔术师。每一个戏法，都是被巧妙引开方向的善意。",
    },
    bioBlurb: {
      en: "He performs in front of crowds and hides his work in the wings. The applause goes to him; the favor goes to his family.",
      zh: "他在台前表演，把功夫留在台后。掌声归他，恩情归他的家人。",
    },
    powerFantasyAxes: {
      dominance: ["intellectual", "martial"],
      pace: ["explosive", "earned"],
      humbleTargets: ["scorners"],
      rewards: ["companions", "recognition"],
    },
  },
  {
    id: "clorinde",
    nameEn: "Clorinde",
    nameZh: "克洛琳德",
    vision: "Electro",
    nation: "Fontaine",
    weapon: "sword",
    archetypeTags: ["duelist", "stoic", "professional", "patient"],
    archetypeBlurb: {
      en: "Champion Duelist of Fontaine's Court of Fontaine. She speaks through the tip of a sword.",
      zh: "枫丹决斗代理人。她用剑尖说话。",
    },
    bioBlurb: {
      en: "She fights other people's duels because no one else will and she's the best at it. The reputation is a side effect.",
      zh: "她替别人打决斗——因为别人不愿，且她最擅长。声名只是副产物。",
    },
    powerFantasyAxes: {
      dominance: ["martial", "political"],
      pace: ["earned", "explosive"],
      humbleTargets: ["scorners", "rival-faction"],
      rewards: ["recognition", "companions"],
    },
  },
];

export function getCanonCharacter(id: string): CanonCharacter | null {
  return CANON_ROSTER.find((c) => c.id === id) ?? null;
}
