import { blockToChunk } from "../utils.js";
import {
  JAVA_STRUCTURE_SETTINGS,
  STRUCTURE_DIMENSIONS,
  STRUCTURE_SOURCES,
  STRUCTURE_TYPES,
  createStructureRecord,
} from "./config.js";
import { createJavaRandom } from "./rng.js";

const REGION_X_MULTIPLIER = 341873128712n;
const REGION_Z_MULTIPLIER = 132897987541n;
const STRONGHOLD_COUNT = 128;
const STRONGHOLD_DISTANCE_CHUNKS = 32;
const CANDIDATE_NOTE = "候補表示のため、実際の生成位置と異なる場合があります。";

export function detectStructures({ seed, edition, centerX, centerZ, radius }) {
  if (edition === "bedrock") {
    return detectBedrockStructureCandidates({ seed, centerX, centerZ, radius });
  }
  if (edition !== "java") {
    return [];
  }

  return [
    ...detectStrongholdCandidates({ seed, centerX, centerZ, radius }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.village,
      idPrefix: "village",
      name: "村候補",
      note: `村は${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.woodlandMansion,
      idPrefix: "woodland-mansion",
      name: "森の洋館候補",
      note: `森の洋館は${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.pillagerOutpost,
      idPrefix: "pillager-outpost",
      name: "ピリジャー前哨基地候補",
      note: `ピリジャー前哨基地は${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.ancientCity,
      idPrefix: "ancient-city",
      name: "古代都市候補",
      note: `古代都市は${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.trialChambers,
      idPrefix: "trial-chambers",
      name: "トライアルチャンバー候補",
      note: `トライアルチャンバーは${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.oceanMonument,
      idPrefix: "ocean-monument",
      name: "海底神殿候補",
      note: `海底神殿は${CANDIDATE_NOTE}`,
      edition,
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.ruinedPortal,
      idPrefix: "ruined-portal",
      name: "廃ポータル候補",
      note: `廃ポータルは${CANDIDATE_NOTE}`,
      edition,
    }),
  ];
}

export function isStructureAutoDetectionAvailable() {
  return true;
}

function detectBedrockStructureCandidates({ seed, centerX, centerZ, radius }) {
  const bedrockSeed = BigInt(seed) ^ 0x5bd1e995n;
  const note = "統合版の構造物は候補表示です。実際の生成位置と異なる場合があります。現時点ではJava版候補ロジックを元にした簡易候補です。";

  return [
    ...detectStrongholdCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      idPrefix: "bedrock-stronghold",
      name: "統合版 要塞候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.village,
      idPrefix: "bedrock-village",
      name: "統合版 村候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.ruinedPortal,
      idPrefix: "bedrock-ruined-portal",
      name: "統合版 廃ポータル候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.oceanMonument,
      idPrefix: "bedrock-ocean-monument",
      name: "統合版 海底神殿候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.woodlandMansion,
      idPrefix: "bedrock-woodland-mansion",
      name: "統合版 森の洋館候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.pillagerOutpost,
      idPrefix: "bedrock-pillager-outpost",
      name: "統合版 ピリジャー前哨基地候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.ancientCity,
      idPrefix: "bedrock-ancient-city",
      name: "統合版 古代都市候補",
      note,
      edition: "bedrock",
    }),
    ...detectStructureCandidates({
      seed: bedrockSeed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.trialChambers,
      idPrefix: "bedrock-trial-chambers",
      name: "統合版 トライアルチャンバー候補",
      note,
      edition: "bedrock",
    }),
  ];
}

function detectStructureCandidates({ seed, centerX, centerZ, radius, settings, idPrefix, name, note, edition = "java" }) {
  const centerChunkX = blockToChunk(centerX);
  const centerChunkZ = blockToChunk(centerZ);
  const minChunkX = centerChunkX - radius;
  const maxChunkX = centerChunkX + radius;
  const minChunkZ = centerChunkZ - radius;
  const maxChunkZ = centerChunkZ + radius;
  const minRegionX = Math.floor(minChunkX / settings.spacing);
  const maxRegionX = Math.floor(maxChunkX / settings.spacing);
  const minRegionZ = Math.floor(minChunkZ / settings.spacing);
  const maxRegionZ = Math.floor(maxChunkZ / settings.spacing);
  const candidates = [];

  for (let regionZ = minRegionZ; regionZ <= maxRegionZ; regionZ += 1) {
    for (let regionX = minRegionX; regionX <= maxRegionX; regionX += 1) {
      const candidate = getRegionStructureCandidate(seed, regionX, regionZ, settings);
      if (
        candidate.chunkX < minChunkX ||
        candidate.chunkX > maxChunkX ||
        candidate.chunkZ < minChunkZ ||
        candidate.chunkZ > maxChunkZ
      ) {
        continue;
      }

      candidates.push(createStructureRecord({
        id: `auto:${idPrefix}:${regionX}:${regionZ}`,
        name,
        type: settings.type,
        x: candidate.x,
        z: candidate.z,
        dimension: STRUCTURE_DIMENSIONS.OVERWORLD,
        source: STRUCTURE_SOURCES.AUTO,
        note,
        edition,
      }));
    }
  }

  return candidates;
}

function detectStrongholdCandidates({
  seed,
  centerX,
  centerZ,
  radius,
  idPrefix = "stronghold",
  name = "要塞候補",
  note = `要塞は${CANDIDATE_NOTE}`,
  edition = "java",
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
      candidates.push(createStructureRecord({
        id: `auto:${idPrefix}:${index}`,
        name,
        type: STRUCTURE_TYPES.STRONGHOLD,
        x: chunkX * 16 + 8,
        z: chunkZ * 16 + 8,
        dimension: STRUCTURE_DIMENSIONS.OVERWORLD,
        source: STRUCTURE_SOURCES.AUTO,
        note,
        edition,
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

function getRegionStructureCandidate(seed, regionX, regionZ, settings) {
  const random = createJavaRandom(
    BigInt(seed) +
    BigInt(regionX) * REGION_X_MULTIPLIER +
    BigInt(regionZ) * REGION_Z_MULTIPLIER +
    settings.salt,
  );
  const bound = settings.spacing - settings.separation;
  const offsetX = random.nextInt(bound);
  const offsetZ = random.nextInt(bound);
  const chunkX = regionX * settings.spacing + offsetX;
  const chunkZ = regionZ * settings.spacing + offsetZ;

  return {
    chunkX,
    chunkZ,
    x: chunkX * 16 + 8,
    z: chunkZ * 16 + 8,
  };
}
