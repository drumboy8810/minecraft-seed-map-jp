import { simpleTerrainProvider } from "../terrain/simple-terrain-provider.js?v=6.0.0";

export const simpleBiomeProvider = {
  id: "simple-biome",
  mode: "preview",
  label: "高速プレビュー",
  isAvailable() {
    return true;
  },
  getStatus() {
    return {
      ok: true,
      message: "高速プレビュー: 疑似バイオームを表示中です。",
    };
  },
  getLegend() {
    return simpleTerrainProvider.getLegend();
  },
  getBiomeAt(seed, edition, version, x, z) {
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    return simpleTerrainProvider.getTerrainForChunk(seed, chunkX, chunkZ, edition, version);
  },
  generateBiomeTiles({ seed, edition, version, bounds, tileSize }) {
    const tiles = [];
    for (let z = bounds.minZ; z < bounds.maxZ; z += tileSize) {
      for (let x = bounds.minX; x < bounds.maxX; x += tileSize) {
        tiles.push({
          x,
          z,
          size: tileSize,
          biome: this.getBiomeAt(seed, edition, version, x, z),
        });
      }
    }
    return tiles;
  },
};
