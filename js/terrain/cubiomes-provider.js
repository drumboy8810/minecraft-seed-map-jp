import { getStatus } from "../biome/cubiomes-provider.js?v=6.0.0";

export const cubiomesProvider = {
  id: "cubiomes",
  label: "詳細バイオーム",
  isAvailable: false,
  unavailableMessage: getStatus().message,
  getLegend() {
    return [];
  },
  getTerrainForChunk() {
    return null;
  },
};
