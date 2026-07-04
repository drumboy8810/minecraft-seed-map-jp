import * as cubiomes from "../biome/cubiomes-provider.js?v=6.0.0";

export const cubiomesBiomeProvider = {
  id: "cubiomes-biome",
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
        ? "正確生成エンジン: cubiomes WASMを利用できます。"
        : "正確生成エンジン未導入: cubiomes WASM未配置のため高速プレビューで表示します。",
      wasmPath: status.wasmPath,
    };
  },
  getLegend() {
    return [];
  },
  getBiomeAt(seed, edition, version, x, z) {
    if (!this.isAvailable()) {
      return null;
    }
    return cubiomes.getBiomeAt(seed, version, x, 64, z);
  },
  generateBiomeTiles({ seed, edition, version, bounds, tileSize }) {
    if (!this.isAvailable()) {
      return [];
    }
    const centerX = Math.round((bounds.minX + bounds.maxX) / 2);
    const centerZ = Math.round((bounds.minZ + bounds.maxZ) / 2);
    const radius = Math.ceil(Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2);
    return cubiomes.generateArea(seed, version, centerX, centerZ, radius, tileSize);
  },
};
