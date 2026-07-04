import * as cubiomes from "../biome/cubiomes-provider.js?v=6.0.0";

export const cubiomesStructureProvider = {
  id: "cubiomes-structure",
  mode: "accurate",
  label: "正確生成",
  async load() {
    return cubiomes.load();
  },
  isAvailable() {
    return cubiomes.isAvailable();
  },
  getStatus() {
    const status = cubiomes.getStatus();
    return {
      ok: status.isAvailable,
      message: status.isAvailable
        ? "正確生成エンジン: 構造物生成providerを利用できます。"
        : "正確生成エンジン未導入: cubiomes WASM未配置のため構造物は候補表示です。",
      wasmPath: status.wasmPath,
      cachedAreas: 0,
    };
  },
  getStructuresInView({ seed, edition, version, centerX, centerZ, radius }) {
    if (!this.isAvailable()) {
      return [];
    }
    if (typeof cubiomes.getStructuresInView !== "function") {
      return [];
    }
    const result = cubiomes.getStructuresInView(seed, version, centerX, centerZ, radius);
    return Array.isArray(result) ? result : result.structures || [];
  },
  getCacheStats() {
    return {
      cachedAreas: 0,
    };
  },
};
