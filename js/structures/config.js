export const STRUCTURE_SOURCES = {
  MANUAL: "manual",
  AUTO: "auto",
};

export const STRUCTURE_DIMENSIONS = {
  OVERWORLD: "overworld",
  NETHER: "nether",
  END: "end",
};

export const STRUCTURE_CATEGORIES = [
  "村",
  "要塞",
  "廃ポータル",
  "海底神殿",
  "森の洋館",
  "ピリジャー前哨基地",
  "古代都市",
  "エンドポータル",
  "ネザー要塞",
  "砦の遺跡",
  "エンドシティ",
  "トライアルチャンバー",
  "スポナー",
  "その他",
];

export const STRUCTURE_TYPES = {
  VILLAGE: STRUCTURE_CATEGORIES[0],
  STRONGHOLD: STRUCTURE_CATEGORIES[1],
  RUINED_PORTAL: STRUCTURE_CATEGORIES[2],
  OCEAN_MONUMENT: STRUCTURE_CATEGORIES[3],
  WOODLAND_MANSION: STRUCTURE_CATEGORIES[4],
  PILLAGER_OUTPOST: STRUCTURE_CATEGORIES[5],
  ANCIENT_CITY: STRUCTURE_CATEGORIES[6],
  TRIAL_CHAMBERS: STRUCTURE_CATEGORIES[11],
};

export const JAVA_STRUCTURE_SETTINGS = {
  village: {
    type: STRUCTURE_TYPES.VILLAGE,
    spacing: 32,
    separation: 8,
    salt: 10387312n,
  },
  ruinedPortal: {
    type: STRUCTURE_TYPES.RUINED_PORTAL,
    spacing: 40,
    separation: 15,
    salt: 34222645n,
  },
  oceanMonument: {
    type: STRUCTURE_TYPES.OCEAN_MONUMENT,
    spacing: 32,
    separation: 5,
    salt: 10387313n,
  },
  woodlandMansion: {
    type: STRUCTURE_TYPES.WOODLAND_MANSION,
    spacing: 80,
    separation: 20,
    salt: 10387319n,
  },
  pillagerOutpost: {
    type: STRUCTURE_TYPES.PILLAGER_OUTPOST,
    spacing: 32,
    separation: 8,
    salt: 165745296n,
  },
  ancientCity: {
    type: STRUCTURE_TYPES.ANCIENT_CITY,
    spacing: 24,
    separation: 8,
    salt: 20083232n,
  },
  trialChambers: {
    type: STRUCTURE_TYPES.TRIAL_CHAMBERS,
    spacing: 34,
    separation: 12,
    salt: 94251327n,
  },
};

export const CATEGORY_COLORS = {
  "村": "#8be071",
  "要塞": "#e3bd64",
  "廃ポータル": "#b27cff",
  "海底神殿": "#58c7e6",
  "森の洋館": "#5fb36d",
  "ピリジャー前哨基地": "#ee796f",
  "古代都市": "#6f8cff",
  "エンドポータル": "#d58cff",
  "ネザー要塞": "#e35454",
  "砦の遺跡": "#d88a45",
  "エンドシティ": "#d6d0ff",
  "トライアルチャンバー": "#78d0b3",
  "スポナー": "#f0d66b",
  "その他": "#b9c7b0",
};

export const CATEGORY_SYMBOLS = {
  "村": "村",
  "要塞": "要",
  "廃ポータル": "廃",
  "海底神殿": "海",
  "森の洋館": "森",
  "ピリジャー前哨基地": "前",
  "古代都市": "古",
  "エンドポータル": "終",
  "ネザー要塞": "ネ",
  "砦の遺跡": "砦",
  "エンドシティ": "都",
  "トライアルチャンバー": "試",
  "スポナー": "湧",
  "その他": "他",
};

const LEGACY_CATEGORY_MAP = new Map([
  ["譚・", "村"],
  ["隕∝｡・", "要塞"],
  ["蟒・・繝ｼ繧ｿ繝ｫ", "廃ポータル"],
  ["豬ｷ蠎慕･樊ｮｿ", "海底神殿"],
  ["譽ｮ縺ｮ豢矩､ｨ", "森の洋館"],
  ["繝斐Μ繧ｸ繝｣繝ｼ蜑榊鐙蝓ｺ蝨ｰ", "ピリジャー前哨基地"],
  ["蜿､莉｣驛ｽ蟶・", "古代都市"],
  ["繝医Λ繧､繧｢繝ｫ繝√Ε繝ｳ繝舌・", "トライアルチャンバー"],
  ["繧ｹ繝昴リ繝ｼ", "スポナー"],
  ["縺昴・莉・", "その他"],
]);

export function normalizeStructureCategory(category) {
  if (STRUCTURE_CATEGORIES.includes(category)) {
    return category;
  }
  return LEGACY_CATEGORY_MAP.get(category) || "その他";
}

export function getCategoryColor(category) {
  return CATEGORY_COLORS[normalizeStructureCategory(category)] || CATEGORY_COLORS["その他"];
}

export function getCategorySymbol(category) {
  return CATEGORY_SYMBOLS[normalizeStructureCategory(category)] || CATEGORY_SYMBOLS["その他"];
}

export function createStructureRecord({
  id,
  name,
  type,
  x,
  z,
  dimension = STRUCTURE_DIMENSIONS.OVERWORLD,
  source = STRUCTURE_SOURCES.MANUAL,
  note = "",
  edition = "",
  createdAt,
}) {
  return {
    id,
    name,
    type: normalizeStructureCategory(type),
    x,
    z,
    dimension,
    source,
    note,
    edition,
    createdAt,
  };
}
