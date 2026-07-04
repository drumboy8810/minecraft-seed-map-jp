import { isSlimeChunk } from "../slime.js?v=5.2.0";

export function isSlimeChunkAt(seed, edition, chunkX, chunkZ) {
  return isSlimeChunk(seed, chunkX, chunkZ, edition);
}
