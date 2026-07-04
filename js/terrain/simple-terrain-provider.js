export const SIMPLE_TERRAIN_TYPES = [
  { id: "plains", label: "草原", color: "#78b85f" },
  { id: "forest", label: "森林", color: "#3f8748" },
  { id: "desert", label: "砂漠", color: "#d9c77a" },
  { id: "snow", label: "雪原", color: "#dce8e5" },
  { id: "ocean", label: "海", color: "#377fb1" },
  { id: "mountains", label: "山岳", color: "#858b7b" },
  { id: "swamp", label: "湿地", color: "#607a50" },
  { id: "savanna", label: "サバンナ", color: "#b4b957" },
  { id: "jungle", label: "ジャングル風", color: "#2f8f3d" },
  { id: "badlands", label: "荒野風", color: "#bf7a4a" },
];

export const simpleTerrainProvider = {
  id: "simple",
  label: "簡易地形",
  isAvailable: true,
  getLegend() {
    return SIMPLE_TERRAIN_TYPES;
  },
  getTerrainForChunk(seed, chunkX, chunkZ) {
    const scale = 22;
    const elevation = octaveNoise(seed, chunkX / scale, chunkZ / scale, 4, 11n);
    const temperature = octaveNoise(seed, chunkX / 36, chunkZ / 36, 3, 97n);
    const moisture = octaveNoise(seed, chunkX / 30, chunkZ / 30, 3, 193n);
    const roughness = octaveNoise(seed, chunkX / 14, chunkZ / 14, 2, 389n);

    if (elevation < 0.28) return SIMPLE_TERRAIN_TYPES[4];
    if (elevation > 0.78 || (elevation > 0.68 && roughness > 0.58)) return SIMPLE_TERRAIN_TYPES[5];
    if (temperature < 0.22) return SIMPLE_TERRAIN_TYPES[3];
    if (temperature > 0.72 && moisture < 0.33) return SIMPLE_TERRAIN_TYPES[2];
    if (temperature > 0.64 && moisture < 0.52) return SIMPLE_TERRAIN_TYPES[7];
    if (temperature > 0.56 && moisture > 0.72) return SIMPLE_TERRAIN_TYPES[8];
    if (temperature > 0.58 && moisture < 0.22 && elevation > 0.48) return SIMPLE_TERRAIN_TYPES[9];
    if (moisture > 0.72 && elevation < 0.55) return SIMPLE_TERRAIN_TYPES[6];
    if (moisture > 0.52) return SIMPLE_TERRAIN_TYPES[1];
    return SIMPLE_TERRAIN_TYPES[0];
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
