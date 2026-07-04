import { simpleTerrainProvider } from "../terrain/simple-terrain-provider.js?v=7.0.0";

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
      message: "高速プレビュー: seed + chunk座標 + 簡易ノイズで疑似バイオームを表示中です。実ワールド/Chunkbase比較用ではありません。",
    };
  },
  getLegend() {
    return simpleTerrainProvider.getLegend();
  },
  getBiomeAt(seed, edition, version, x, z) {
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    const biome = simpleTerrainProvider.getTerrainForChunk(seed, chunkX, chunkZ, edition, version);
    return {
      ...biome,
      providerId: "simple-biome",
      providerName: edition === "bedrock" ? "Bedrockモード / 疑似バイオーム" : "高速プレビュー / 疑似バイオーム",
      precisionMode: edition === "bedrock" ? "bedrock" : "preview",
      basis: `seed + chunk(${chunkX}, ${chunkZ}) + ${edition}/${version} + 簡易ノイズ`,
    };
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
