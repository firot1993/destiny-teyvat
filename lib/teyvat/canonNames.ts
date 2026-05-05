const CHINESE_NAMES: readonly string[] = [
  "神里绫华", "绫华",
  "神里绫人", "绫人",
  "八重神子", "神子",
  "雷电将军", "雷电影", "影",
  "九条裟罗", "裟罗",
  "宵宫",
  "枫原万叶", "万叶",
  "珊瑚宫心海", "心海",
  "荒泷一斗", "一斗",
  "久岐忍",
  "鹿野院平藏", "平藏",
  "早柚",
  "托马",
  "荧",
  "空",
  "派蒙",
  "甘雨",
  "钟离",
  "凝光",
  "刻晴",
  "胡桃",
  "魈",
  "夜兰",
  "申鹤",
  "云堇",
  "白术",
  "瑶瑶",
  "辛焱",
  "重云",
  "行秋",
  "香菱",
  "北斗",
  "烟绯",
  "七七",
  "迪卢克",
  "琴",
  "可莉",
  "丽莎",
  "安柏",
  "凯亚",
  "诺艾尔",
  "温迪",
  "芭芭拉",
  "砂糖",
  "莫娜",
  "阿贝多",
  "罗莎莉亚",
  "优菈",
  "迪奥娜",
  "雷泽",
  "菲谢尔",
  "班尼特",
  "纳西妲",
  "提纳里",
  "妮露",
  "赛诺",
  "柯莱",
  "多莉",
  "坎蒂丝",
  "莱依拉",
  "珐露珊",
  "艾尔海森",
  "迪希雅",
  "卡维",
  "流浪者", "散兵",
  "芙宁娜",
  "那维莱特",
  "莱欧斯利",
  "夏沃蕾",
  "林尼",
  "琳妮特",
  "菲米尼",
  "夏洛蒂",
  "娜维娅",
  "莱依特",
  "克洛琳德",
  "希格雯",
  "艾梅莉埃",
  "玛薇卡",
  "卡齐娜",
  "希诺宁",
  "穆阿拉尼",
  "基尼奇",
  "茜特菈莉",
  "达达利亚", "公子",
  "罗莎莉亚",
  "皇女",
];

const ENGLISH_NAMES: readonly string[] = [
  "Kamisato Ayaka", "Ayaka",
  "Kamisato Ayato", "Ayato",
  "Yae Miko",
  "Raiden Shogun", "Raiden", "Ei",
  "Kujou Sara", "Sara",
  "Yoimiya",
  "Kaedehara Kazuha", "Kazuha",
  "Sangonomiya Kokomi", "Kokomi",
  "Arataki Itto", "Itto",
  "Kuki Shinobu", "Shinobu",
  "Shikanoin Heizou", "Heizou",
  "Sayu",
  "Thoma",
  "Aether",
  "Lumine",
  "Paimon",
  "Ganyu",
  "Zhongli",
  "Ningguang",
  "Keqing",
  "Hu Tao",
  "Xiao",
  "Yelan",
  "Shenhe",
  "Yun Jin",
  "Baizhu",
  "Yaoyao",
  "Xinyan",
  "Chongyun",
  "Xingqiu",
  "Xiangling",
  "Beidou",
  "Yanfei",
  "Qiqi",
  "Diluc",
  "Jean",
  "Klee",
  "Lisa",
  "Amber",
  "Kaeya",
  "Noelle",
  "Venti",
  "Barbara",
  "Sucrose",
  "Mona",
  "Albedo",
  "Rosaria",
  "Eula",
  "Diona",
  "Razor",
  "Fischl",
  "Bennett",
  "Mika",
  "Nahida",
  "Tighnari",
  "Nilou",
  "Cyno",
  "Collei",
  "Dori",
  "Candace",
  "Layla",
  "Faruzan",
  "Alhaitham",
  "Dehya",
  "Kaveh",
  "Wanderer", "Scaramouche",
  "Furina",
  "Neuvillette",
  "Wriothesley",
  "Chevreuse",
  "Lyney",
  "Lynette",
  "Freminet",
  "Charlotte",
  "Navia",
  "Clorinde",
  "Sigewinne",
  "Emilie",
  "Mavuika",
  "Kachina",
  "Xilonen",
  "Mualani",
  "Kinich",
  "Citlali",
  "Tartaglia", "Childe",
  "Signora",
  "Pulcinella",
  "Arlecchino",
  "Pantalone",
  "Sandrone",
  "Pierro",
  "Capitano",
  "Dottore",
];

export const CANON_NAMES: readonly string[] = [...CHINESE_NAMES, ...ENGLISH_NAMES];

const HAS_CJK = /[一-鿿]/;

function isAscii(value: string): boolean {
  return !HAS_CJK.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesCanonName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const valueIsAscii = isAscii(trimmed);
  const lowerValue = trimmed.toLowerCase();

  for (const canon of CANON_NAMES) {
    const canonIsAscii = isAscii(canon);

    if (canonIsAscii !== valueIsAscii) {
      continue;
    }

    if (canonIsAscii) {
      const pattern = new RegExp(`\\b${escapeRegExp(canon)}\\b`, "i");
      if (pattern.test(trimmed)) {
        return canon;
      }
    } else {
      // Bidirectional substring: generated ⊆ canon, or canon ⊆ generated.
      // Also covers the "family name overlap" case: if any length-2+ prefix of
      // the generated name appears inside the canon name (e.g. "神里小百合"
      // shares prefix "神里" with canon "神里绫华").
      if (trimmed.includes(canon) || canon.includes(trimmed)) {
        return canon;
      }
      for (let len = 2; len < trimmed.length; len++) {
        if (canon.includes(trimmed.slice(0, len))) {
          return canon;
        }
      }
    }

    void lowerValue;
  }

  return null;
}
