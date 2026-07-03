export const cubiomesProvider = {
  id: "cubiomes",
  label: "詳細バイオーム",
  isAvailable: false,
  unavailableMessage: "詳細バイオームは準備中です。現在は簡易地形のみ利用できます。",
  getLegend() {
    return [];
  },
  getTerrainForChunk() {
    return null;
  },
};
