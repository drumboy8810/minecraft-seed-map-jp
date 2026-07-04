import { simpleTerrainProvider } from "../terrain/simple-terrain-provider.js?v=5.2.0";

export function getBiomeAt(seed, edition, version, x, z) {
  const chunkX = Math.floor(x / 16);
  const chunkZ = Math.floor(z / 16);
  return simpleTerrainProvider.getTerrainForChunk(seed, chunkX, chunkZ, edition, version);
}

export function generateBiomeTiles({ seed, edition, version, bounds, tileSize }) {
  const tiles = [];
  for (let z = bounds.minZ; z < bounds.maxZ; z += tileSize) {
    for (let x = bounds.minX; x < bounds.maxX; x += tileSize) {
      tiles.push({
        x,
        z,
        size: tileSize,
        biome: getBiomeAt(seed, edition, version, x, z),
      });
    }
  }
  return tiles;
}
