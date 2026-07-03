import { blockToChunk } from "../utils.js";
import {
  JAVA_STRUCTURE_SETTINGS,
  STRUCTURE_DIMENSIONS,
  STRUCTURE_SOURCES,
  createStructureRecord,
} from "./config.js";
import { createJavaRandom } from "./rng.js";

const REGION_X_MULTIPLIER = 341873128712n;
const REGION_Z_MULTIPLIER = 132897987541n;

export function detectStructures({ seed, edition, centerX, centerZ, radius }) {
  if (edition !== "java") {
    return [];
  }

  return [
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.village,
      idPrefix: "village",
      name: "村候補",
      note: "村は候補表示のため、実際の生成位置と異なる場合があります。",
    }),
    ...detectStructureCandidates({
      seed,
      centerX,
      centerZ,
      radius,
      settings: JAVA_STRUCTURE_SETTINGS.ruinedPortal,
      idPrefix: "ruined-portal",
      name: "廃ポータル候補",
      note: "候補表示のため、実際の生成位置と異なる場合があります。",
    }),
  ];
}

export function isStructureAutoDetectionAvailable() {
  return true;
}

function detectStructureCandidates({ seed, centerX, centerZ, radius, settings, idPrefix, name, note }) {
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
      }));
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
