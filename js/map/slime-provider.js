import { isSlimeChunk } from "../slime.js?v=7.0.0";

export function isSlimeChunkAt(seed, edition, chunkX, chunkZ) {
  return isSlimeChunk(seed, chunkX, chunkZ, edition);
}
