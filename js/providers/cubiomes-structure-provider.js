import * as cubiomes from "../biome/cubiomes-provider.js?v=7.0.0";

export const cubiomesStructureProvider = {
  id: "cubiomes-structure",
  mode: "accurate",
  label: "正確生成",
  async load() {
    return cubiomes.load();
  },
  isAvailable() {
    return cubiomes.hasExport(["getStructuresInView", "get_structures_in_view", "cubiomes_get_structures_in_view"]);
  },
  getStatus() {
    const status = cubiomes.getStatus();
    const available = this.isAvailable();
    return {
      ok: available,
      message: available
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
    const structures = Array.isArray(result) ? result : result.structures || [];
    return structures.map((structure) => ({
      ...structure,
      providerId: "cubiomes-structure",
      providerName: "cubiomes正確生成",
      precisionMode: "accurate",
      confidence: structure.confidence || "高",
      basis: structure.basis || "cubiomes WASMによるJava版構造物生成",
    }));
  },
  getCacheStats() {
    return {
      cachedAreas: 0,
    };
  },
};
