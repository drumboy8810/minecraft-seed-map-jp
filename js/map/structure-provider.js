import { detectStructures } from "../structures/detector.js?v=5.2.0";

const CACHE_LIMIT = 48;
const cache = new Map();

export function getStructuresInView({ seed, edition, version, centerX, centerZ, radius }) {
  const expandedRadius = Math.min(Math.max(radius + Math.ceil(radius * 0.6), radius + 24), 220);
  const cacheCenterX = Math.round(centerX / 512) * 512;
  const cacheCenterZ = Math.round(centerZ / 512) * 512;
  const key = `${seed}:${edition}:${version}:${cacheCenterX}:${cacheCenterZ}:${expandedRadius}`;
  const cached = cache.get(key);
  if (cached) {
    return cached.map((structure) => ({ ...structure }));
  }

  const structures = detectStructures({
    seed,
    edition,
    version,
    centerX: cacheCenterX,
    centerZ: cacheCenterZ,
    radius: expandedRadius,
  });

  cache.set(key, structures);
  trimCache();
  return structures.map((structure) => ({ ...structure }));
}

export function getStructureCacheStats() {
  return {
    cachedAreas: cache.size,
  };
}

function trimCache() {
  while (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}
