export const TERRAIN_TYPES = [
  { id: "plains", label: "草原", color: "#6fa85d" },
  { id: "forest", label: "森林", color: "#3f7f4a" },
  { id: "desert", label: "砂漠", color: "#c9b66d" },
  { id: "snow", label: "雪原", color: "#d8e3df" },
  { id: "ocean", label: "海", color: "#3f7f9f" },
  { id: "mountains", label: "山岳", color: "#7d8272" },
  { id: "swamp", label: "湿地", color: "#5f7650" },
];

export function getTerrainForChunk(seed, chunkX, chunkZ) {
  const regionX = Math.floor(chunkX / 5);
  const regionZ = Math.floor(chunkZ / 5);
  const value = hashToUnit(seed, regionX, regionZ);

  if (value < 0.16) return TERRAIN_TYPES[4];
  if (value < 0.28) return TERRAIN_TYPES[2];
  if (value < 0.42) return TERRAIN_TYPES[1];
  if (value < 0.56) return TERRAIN_TYPES[0];
  if (value < 0.68) return TERRAIN_TYPES[5];
  if (value < 0.80) return TERRAIN_TYPES[6];
  return TERRAIN_TYPES[3];
}

function hashToUnit(seed, x, z) {
  let value =
    BigInt(seed) +
    BigInt(x) * 341873128712n +
    BigInt(z) * 132897987541n +
    BigInt(x * z) * 42317861n;
  value ^= value >> 23n;
  value *= 0x2127599bf4325c37n;
  value ^= value >> 47n;
  return Number(value & 0xffffn) / 0x10000;
}
