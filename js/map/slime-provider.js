import { isSlimeChunk } from "../slime.js?v=5.0.1";

export function isSlimeChunkAt(seed, edition, chunkX, chunkZ) {
  return isSlimeChunk(seed, chunkX, chunkZ, edition);
}
