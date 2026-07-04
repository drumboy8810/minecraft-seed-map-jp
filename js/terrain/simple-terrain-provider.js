export const SIMPLE_TERRAIN_TYPES = [
  { id: "plains", label: "草原", color: "#78b85f" },
  { id: "forest", label: "森", color: "#3f8748" },
  { id: "dark_forest", label: "暗い森", color: "#2f6339" },
  { id: "desert", label: "砂漠", color: "#d9c77a" },
  { id: "snow", label: "雪原", color: "#dce8e5" },
  { id: "ocean", label: "海", color: "#377fb1" },
  { id: "river", label: "川", color: "#4b91c7" },
  { id: "mountains", label: "山岳", color: "#858b7b" },
  { id: "swamp", label: "湿地", color: "#607a50" },
  { id: "savanna", label: "サバンナ", color: "#b4b957" },
  { id: "jungle", label: "ジャングル風", color: "#2f8f3d" },
  { id: "badlands", label: "荒野風", color: "#bf7a4a" },
];

const TERRAIN = Object.fromEntries(SIMPLE_TERRAIN_TYPES.map((terrain) => [terrain.id, terrain]));

export const simpleTerrainProvider = {
  id: "simple",
  label: "疑似バイオーム",
  isAvailable: true,
  getLegend() {
    return SIMPLE_TERRAIN_TYPES;
  },
  getTerrainForChunk(seed, chunkX, chunkZ) {
    const scale = 24;
    const elevation = octaveNoise(seed, chunkX / scale, chunkZ / scale, 5, 11n);
    const temperature = octaveNoise(seed, chunkX / 42, chunkZ / 42, 4, 97n);
    const moisture = octaveNoise(seed, chunkX / 34, chunkZ / 34, 4, 193n);
    const roughness = octaveNoise(seed, chunkX / 16, chunkZ / 16, 3, 389n);
    const river = Math.abs(octaveNoise(seed, chunkX / 18, chunkZ / 18, 3, 577n) - 0.5);

    if (river < 0.035 && elevation > 0.31 && elevation < 0.72) return TERRAIN.river;
    if (elevation < 0.27) return TERRAIN.ocean;
    if (elevation > 0.8 || (elevation > 0.68 && roughness > 0.6)) return TERRAIN.mountains;
    if (temperature < 0.22) return TERRAIN.snow;
    if (temperature > 0.74 && moisture < 0.34) return TERRAIN.desert;
    if (temperature > 0.64 && moisture < 0.52) return TERRAIN.savanna;
    if (temperature > 0.57 && moisture > 0.72) return TERRAIN.jungle;
    if (temperature > 0.58 && moisture < 0.24 && elevation > 0.48) return TERRAIN.badlands;
    if (moisture > 0.75 && elevation < 0.55) return TERRAIN.swamp;
    if (moisture > 0.64) return TERRAIN.dark_forest;
    if (moisture > 0.48) return TERRAIN.forest;
    return TERRAIN.plains;
  },
};

function octaveNoise(seed, x, z, octaves, salt) {
  let value = 0;
  let amplitude = 1;
  let amplitudeSum = 0;
  let frequency = 1;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += smoothNoise(seed + salt + BigInt(octave) * 1009n, x * frequency, z * frequency) * amplitude;
    amplitudeSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / amplitudeSum;
}

function smoothNoise(seed, x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothStep(x - x0);
  const tz = smoothStep(z - z0);
  const a = hashToUnit(seed, x0, z0);
  const b = hashToUnit(seed, x1, z0);
  const c = hashToUnit(seed, x0, z1);
  const d = hashToUnit(seed, x1, z1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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
