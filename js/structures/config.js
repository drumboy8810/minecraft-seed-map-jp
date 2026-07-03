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

export function normalizeStructureCategory(category) {
  return STRUCTURE_CATEGORIES.includes(category) ? category : "その他";
}

export function getCategoryColor(category) {
  return CATEGORY_COLORS[normalizeStructureCategory(category)] || CATEGORY_COLORS["その他"];
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
    createdAt,
  };
}
