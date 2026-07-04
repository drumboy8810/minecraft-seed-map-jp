import { detectStructures } from "../structures/detector.js?v=7.0.0";

const CACHE_LIMIT = 48;
const cache = new Map();

export const simpleStructureProvider = {
  id: "simple-structure",
  mode: "preview",
  label: "プレビュー生成",
  isAvailable() {
    return true;
  },
  getStatus() {
    return {
      ok: true,
      message: "プレビュー生成: seedと疑似バイオームから構造物プレビューを表示中です。実ワールド/Chunkbase比較用ではありません。",
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
    providerName: "構造物プレビュー",
    precisionMode: "preview",
    basis: structure.reason || "seed + region座標 + 疑似バイオームによるプレビュー表示",
  };
}

function trimCache() {
  while (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}
