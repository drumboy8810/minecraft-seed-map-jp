export const JAVA_BIOME_COLORS = {
  plains: { id: "plains", label: "Plains", color: "#8fcf68" },
  forest: { id: "forest", label: "Forest", color: "#4f9a4b" },
  dark_forest: { id: "dark_forest", label: "Dark Forest", color: "#2f6339" },
  birch_forest: { id: "birch_forest", label: "Birch Forest", color: "#6fa85e" },
  desert: { id: "desert", label: "Desert", color: "#d9c77a" },
  savanna: { id: "savanna", label: "Savanna", color: "#b4b957" },
  jungle: { id: "jungle", label: "Jungle", color: "#2f8f3d" },
  swamp: { id: "swamp", label: "Swamp", color: "#607a50" },
  mangrove_swamp: { id: "mangrove_swamp", label: "Mangrove Swamp", color: "#4d7a5b" },
  ocean: { id: "ocean", label: "Ocean", color: "#377fb1" },
  deep_ocean: { id: "deep_ocean", label: "Deep Ocean", color: "#27669a" },
  river: { id: "river", label: "River", color: "#4b91c7" },
  frozen_ocean: { id: "frozen_ocean", label: "Frozen Ocean", color: "#9bc8d8" },
  snowy_plains: { id: "snowy_plains", label: "Snowy Plains", color: "#dce8e5" },
  snowy_taiga: { id: "snowy_taiga", label: "Snowy Taiga", color: "#b8d2c8" },
  mountains: { id: "mountains", label: "Mountains", color: "#858b7b" },
  meadow: { id: "meadow", label: "Meadow", color: "#92c96a" },
  grove: { id: "grove", label: "Grove", color: "#9fbba6" },
  jagged_peaks: { id: "jagged_peaks", label: "Jagged Peaks", color: "#c7c7be" },
  stony_peaks: { id: "stony_peaks", label: "Stony Peaks", color: "#a8a08d" },
  badlands: { id: "badlands", label: "Badlands", color: "#bf7a4a" },
  wooded_badlands: { id: "wooded_badlands", label: "Wooded Badlands", color: "#a56f48" },
};

const NUMERIC_BIOME_IDS = new Map([
  [1, "plains"],
  [2, "desert"],
  [4, "forest"],
  [6, "swamp"],
  [16, "ocean"],
  [24, "deep_ocean"],
  [25, "river"],
  [27, "frozen_ocean"],
  [29, "snowy_plains"],
  [32, "savanna"],
  [33, "jungle"],
  [35, "badlands"],
  [37, "mountains"],
]);

export function normalizeBiomeResult(result) {
  if (!result) return null;
  if (result.color && result.id) return result;

  const rawId = result.biomeId ?? result.biome ?? result.id;
  const id = normalizeBiomeId(rawId);
  const biome = JAVA_BIOME_COLORS[id] || {
    id,
    label: String(rawId ?? "Unknown"),
    color: "#6f7d68",
  };

  return {
    ...biome,
    raw: result,
    provider: result.provider || "cubiomes",
  };
}

export function normalizeBiomeId(value) {
  if (typeof value === "number") {
    return NUMERIC_BIOME_IDS.get(value) || `biome_${value}`;
  }
  return String(value ?? "unknown")
    .replace(/^minecraft:/, "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}
