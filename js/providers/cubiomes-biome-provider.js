import * as cubiomes from "../biome/cubiomes-provider.js?v=7.0.0";
import { JAVA_BIOME_COLORS, normalizeBiomeResult } from "./biome-colors.js?v=7.0.0";

export const cubiomesBiomeProvider = {
  id: "cubiomes-biome",
  mode: "accurate",
  label: "正確生成",
  async load() {
    return cubiomes.load();
  },
  isAvailable() {
    return cubiomes.hasExport(["getBiomeAt", "get_biome_at", "cubiomes_get_biome_at"]);
  },
  getStatus() {
    const status = cubiomes.getStatus();
    const available = this.isAvailable();
    return {
      ok: available,
      message: available
        ? "正確生成エンジン: cubiomes WASMを利用できます。"
        : "正確生成エンジン未導入: cubiomes WASM未配置のため高速プレビューで表示します。",
      wasmPath: status.wasmPath,
    };
  },
  getLegend() {
    return Object.values(JAVA_BIOME_COLORS);
  },
  getBiomeAt(seed, edition, version, x, z) {
    if (!this.isAvailable()) {
      return null;
    }
    return normalizeBiomeResult(cubiomes.getBiomeAt(seed, version, x, 64, z));
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
