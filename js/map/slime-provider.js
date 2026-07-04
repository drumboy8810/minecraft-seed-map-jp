import { isSlimeChunk } from "../slime.js";

export function isSlimeChunkAt(seed, edition, chunkX, chunkZ) {
  return isSlimeChunk(seed, chunkX, chunkZ, edition);
}
