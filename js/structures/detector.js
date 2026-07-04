import { blockToChunk } from "../utils.js?v=6.0.0";
import { simpleTerrainProvider } from "../terrain/simple-terrain-provider.js?v=6.0.0";
import {
  STRUCTURE_DIMENSIONS,
  STRUCTURE_SOURCES,
  STRUCTURE_TYPES,
  createStructureRecord,
} from "./config.js?v=6.0.0";
import { createJavaRandom } from "./rng.js?v=6.0.0";

const REGION_X_MULTIPLIER = 341873128712n;
const REGION_Z_MULTIPLIER = 132897987541n;
const STRONGHOLD_COUNT = 128;
const STRONGHOLD_DISTANCE_CHUNKS = 32;
const DEFAULT_MAX_CANDIDATES = 900;

const JAVA_SETTINGS = [
  {
    key: "village",
    type: STRUCTURE_TYPES.VILLAGE,
    name: "村候補",
    spacing: 32,
    separation: 8,
    salt: 10387312n,
    preferredBiomes: ["plains", "desert", "savanna", "snow"],
    nearbyBiomes: ["forest", "river"],
    highReason: "疑似バイオームが村向きです。",
    mediumReason: "村が生成されやすい地形の近くです。",
  },
  {
    key: "ruined-portal",
    type: STRUCTURE_TYPES.RUINED_PORTAL,
    name: "廃ポータル候補",
    spacing: 40,
    separation: 15,
    salt: 34222645n,
    preferredBiomes: ["plains", "forest", "desert", "savanna", "snow", "mountains", "badlands", "swamp", "jungle"],
    allowLow: true,
    highReason: "広い地形で候補になりやすい構造物です。",
    mediumReason: "周辺地形を問わない広域候補です。",
  },
  {
    key: "ocean-monument",
    type: STRUCTURE_TYPES.OCEAN_MONUMENT,
    name: "海底神殿候補",
    spacing: 32,
    separation: 5,
    salt: 10387313n,
    preferredBiomes: ["ocean"],
    nearbyBiomes: ["river", "swamp"],
    highReason: "疑似バイオームが海です。",
    mediumReason: "水辺寄りの地形です。",
  },
  {
    key: "woodland-mansion",
    type: STRUCTURE_TYPES.WOODLAND_MANSION,
    name: "森の洋館候補",
    spacing: 80,
    separation: 20,
    salt: 10387319n,
    preferredBiomes: ["dark_forest"],
    nearbyBiomes: ["forest"],
    highReason: "疑似バイオームが暗い森です。",
    mediumReason: "森林地形の近くです。",
  },
  {
    key: "pillager-outpost",
    type: STRUCTURE_TYPES.PILLAGER_OUTPOST,
    name: "ピリジャー前哨基地候補",
    spacing: 32,
    separation: 8,
    salt: 165745296n,
    preferredBiomes: ["plains", "desert", "savanna", "snow"],
    nearbyBiomes: ["forest", "river"],
    highReason: "村向き地形に近いため前哨基地候補です。",
    mediumReason: "村周辺として扱える地形です。",
  },
  {
    key: "ancient-city",
    type: STRUCTURE_TYPES.ANCIENT_CITY,
    name: "古代都市候補",
    spacing: 24,
    separation: 8,
    salt: 20083232n,
    preferredBiomes: ["mountains", "snow"],
    nearbyBiomes: ["dark_forest"],
    highReason: "山岳/雪原系の疑似バイオームです。",
    mediumReason: "高低差のありそうな地形に近い候補です。",
  },
  {
    key: "trial-chambers",
    type: STRUCTURE_TYPES.TRIAL_CHAMBERS,
    name: "トライアルチャンバー候補",
    spacing: 34,
    separation: 12,
    salt: 94251327n,
    preferredBiomes: ["plains", "forest", "desert", "savanna", "snow", "mountains", "badlands", "swamp", "jungle", "dark_forest"],
    allowLow: true,
    highReason: "広い地形で候補として扱います。",
    mediumReason: "現在は広域候補として表示しています。",
  },
];

const BEDROCK_SETTINGS = JAVA_SETTINGS.map((setting) => ({
  ...setting,
  spacing: Math.max(20, Math.round(setting.spacing * 0.92)),
  separation: Math.max(4, Math.round(setting.separation * 0.85)),
  salt: setting.salt + 912673n,
  name: `統合版 ${setting.name}`,
}));

export function detectStructures({ seed, edition, version, centerX, centerZ, radius, maxCandidates = DEFAULT_MAX_CANDIDATES }) {
  const searchRadius = Math.min(Math.max(radius + Math.ceil(radius * 0.55), radius + 24), 220);
  const settings = edition === "bedrock" ? BEDROCK_SETTINGS : JAVA_SETTINGS;
  const structureSeed = edition === "bedrock" ? BigInt(seed) ^ 0x5bd1e995n : BigInt(seed);
  const records = [
    ...detectStrongholdCandidates({
      seed: structureSeed,
      centerX,
      centerZ,
      radius: searchRadius,
      edition,
      version,
    }),
  ];

  for (const setting of settings) {
    records.push(...detectRegionStructureCandidates({
      seed: structureSeed,
      centerX,
      centerZ,
      radius: searchRadius,
      setting,
      edition,
      version,
    }));
    if (records.length > maxCandidates) break;
  }

  return records
    .sort((a, b) => distanceSquared(a, centerX, centerZ) - distanceSquared(b, centerX, centerZ))
    .slice(0, maxCandidates);
}

export function isStructureAutoDetectionAvailable() {
  return true;
}

function detectRegionStructureCandidates({ seed, centerX, centerZ, radius, setting, edition, version }) {
  const centerChunkX = blockToChunk(centerX);
  const centerChunkZ = blockToChunk(centerZ);
  const minChunkX = centerChunkX - radius;
  const maxChunkX = centerChunkX + radius;
  const minChunkZ = centerChunkZ - radius;
  const maxChunkZ = centerChunkZ + radius;
  const minRegionX = Math.floor(minChunkX / setting.spacing);
  const maxRegionX = Math.floor(maxChunkX / setting.spacing);
  const minRegionZ = Math.floor(minChunkZ / setting.spacing);
  const maxRegionZ = Math.floor(maxChunkZ / setting.spacing);
  const candidates = [];

  for (let regionZ = minRegionZ; regionZ <= maxRegionZ; regionZ += 1) {
    for (let regionX = minRegionX; regionX <= maxRegionX; regionX += 1) {
      const candidate = getRegionStructureCandidate(seed, regionX, regionZ, setting);
      if (
        candidate.chunkX < minChunkX ||
        candidate.chunkX > maxChunkX ||
        candidate.chunkZ < minChunkZ ||
        candidate.chunkZ > maxChunkZ
      ) {
        continue;
      }

      const biome = simpleTerrainProvider.getTerrainForChunk(seed, candidate.chunkX, candidate.chunkZ);
      const confidence = getBiomeConfidence(setting, biome.id);
      if (confidence === "除外") continue;
      const reason = getCandidateReason(setting, confidence, biome);

      candidates.push(createStructureRecord({
        id: `auto:${edition}:${setting.key}:${regionX}:${regionZ}`,
        name: setting.name,
        type: setting.type,
        x: candidate.x,
        z: candidate.z,
        dimension: STRUCTURE_DIMENSIONS.OVERWORLD,
        source: STRUCTURE_SOURCES.AUTO,
        note: "seedと疑似バイオームから推定した候補です。完全一致ではありません。",
        edition,
        version,
        confidence,
        reason,
        biome: biome.label,
      }));
    }
  }

  return candidates;
}

function getBiomeConfidence(setting, biomeId) {
  if (setting.preferredBiomes.includes(biomeId)) return "高";
  if (setting.nearbyBiomes?.includes(biomeId)) return "中";
  if (setting.allowLow) return "低";
  return "除外";
}

function getCandidateReason(setting, confidence, biome) {
  if (confidence === "高") return `${setting.highReason} 疑似バイオーム: ${biome.label}`;
  if (confidence === "中") return `${setting.mediumReason} 疑似バイオーム: ${biome.label}`;
  return `現在は広域候補として表示しています。疑似バイオーム: ${biome.label}`;
}

function detectStrongholdCandidates({
  seed,
  centerX,
  centerZ,
  radius,
  edition = "java",
  version = "java-1.21",
}) {
  const centerChunkX = blockToChunk(centerX);
  const centerChunkZ = blockToChunk(centerZ);
  const minChunkX = centerChunkX - radius;
  const maxChunkX = centerChunkX + radius;
  const minChunkZ = centerChunkZ - radius;
  const maxChunkZ = centerChunkZ + radius;
  const candidates = [];
  const random = createJavaRandom(seed);
  let angle = random.nextDouble() * Math.PI * 2;
  let ring = 0;
  let ringPosition = 0;
  let ringCount = 3;

  for (let index = 0; index < STRONGHOLD_COUNT; index += 1) {
    const distance = (4 * ring + 4 + random.nextDouble() * 6) * STRONGHOLD_DISTANCE_CHUNKS;
    const chunkX = Math.round(Math.cos(angle) * distance);
    const chunkZ = Math.round(Math.sin(angle) * distance);

    if (
      chunkX >= minChunkX &&
      chunkX <= maxChunkX &&
      chunkZ >= minChunkZ &&
      chunkZ <= maxChunkZ
    ) {
      const biome = simpleTerrainProvider.getTerrainForChunk(seed, chunkX, chunkZ);
      candidates.push(createStructureRecord({
        id: `auto:${edition}:stronghold:${index}`,
        name: edition === "bedrock" ? "統合版 要塞候補" : "要塞候補",
        type: STRUCTURE_TYPES.STRONGHOLD,
        x: chunkX * 16 + 8,
        z: chunkZ * 16 + 8,
        dimension: STRUCTURE_DIMENSIONS.OVERWORLD,
        source: STRUCTURE_SOURCES.AUTO,
        note: "要塞リングを元にした疑似候補です。完全一致ではありません。",
        edition,
        version,
        confidence: "中",
        reason: `要塞リングに近い候補です。疑似バイオーム: ${biome.label}`,
        biome: biome.label,
      }));
    }

    angle += (Math.PI * 2) / ringCount;
    ringPosition += 1;

    if (ringPosition === ringCount) {
      ring += 1;
      ringPosition = 0;
      ringCount += Math.floor((2 * ringCount) / (ring + 1));
      ringCount = Math.min(ringCount, STRONGHOLD_COUNT - index - 1);
      angle += random.nextDouble() * Math.PI * 2;
    }
  }

  return candidates;
}

function getRegionStructureCandidate(seed, regionX, regionZ, setting) {
  const random = createJavaRandom(
    BigInt(seed) +
    BigInt(regionX) * REGION_X_MULTIPLIER +
    BigInt(regionZ) * REGION_Z_MULTIPLIER +
    BigInt(hashStructureKey(setting.key)) +
    setting.salt,
  );
  const bound = Math.max(1, setting.spacing - setting.separation);
  const offsetX = random.nextInt(bound);
  const offsetZ = random.nextInt(bound);
  const chunkX = regionX * setting.spacing + offsetX;
  const chunkZ = regionZ * setting.spacing + offsetZ;

  return {
    chunkX,
    chunkZ,
    x: chunkX * 16 + 8,
    z: chunkZ * 16 + 8,
  };
}

function hashStructureKey(key) {
  let value = 0;
  for (let index = 0; index < key.length; index += 1) {
    value = (value * 31 + key.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

function distanceSquared(record, x, z) {
  const dx = record.x - x;
  const dz = record.z - z;
  return dx * dx + dz * dz;
}
