import { detectStructures } from "../structures/detector.js?v=7.0.0";

const CACHE_LIMIT = 48;
const cache = new Map();

export const simpleStructureProvider = {
  id: "simple-structure",
  mode: "preview",
  label: "高速プレビュー",
  isAvailable() {
    return true;
  },
  getStatus() {
    return {
      ok: true,
      message: "高速プレビュー: seedと疑似バイオームから構造物候補を表示中です。",
      cachedAreas: cache.size,
    };
  },
  getStructuresInView({ seed, edition, version, centerX, centerZ, radius }) {
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

    const annotated = structures.map(annotateStructure);
    cache.set(key, annotated);
    trimCache();
    return annotated.map((structure) => ({ ...structure }));
  },
  getCacheStats() {
    return {
      cachedAreas: cache.size,
    };
  },
};

function annotateStructure(structure) {
  return {
    ...structure,
    providerId: "simple-structure",
    providerName: "高速プレビュー候補",
    precisionMode: "preview",
    basis: structure.reason || "seed + region座標 + 疑似バイオームによる候補表示",
  };
}

function trimCache() {
  while (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}
