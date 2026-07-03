export function toInteger(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return null;
  }
  return number;
}

export function blockToChunk(blockCoordinate) {
  return Math.floor(blockCoordinate / 16);
}

export function chunkToBlockRange(chunkCoordinate) {
  const start = chunkCoordinate * 16;
  return {
    start,
    end: start + 15,
  };
}

export function chunkToCenterBlock(chunkCoordinate) {
  return chunkCoordinate * 16 + 8;
}

export function formatChunkDetails(chunk) {
  const xRange = chunkToBlockRange(chunk.x);
  const zRange = chunkToBlockRange(chunk.z);
  const centerX = chunkToCenterBlock(chunk.x);
  const centerZ = chunkToCenterBlock(chunk.z);
  return {
    chunkText: `X=${chunk.x}, Z=${chunk.z}`,
    blockText: `X=${xRange.start}〜${xRange.end} / Z=${zRange.start}〜${zRange.end}`,
    centerText: `X=${centerX}, Z=${centerZ}`,
    resultText: chunk.isSlime ? "スライムチャンク" : "通常チャンク",
    chunkCopyText: `チャンク座標: X=${chunk.x}, Z=${chunk.z}`,
    centerCopyText: `中心ブロック座標: X=${centerX}, Z=${centerZ}`,
    rangeCopyText: `ブロック範囲: X=${xRange.start}〜${xRange.end}, Z=${zRange.start}〜${zRange.end}`,
    copyText: `チャンク座標: X=${chunk.x}, Z=${chunk.z}\nブロック範囲: X=${xRange.start}〜${xRange.end}, Z=${zRange.start}〜${zRange.end}\n中心ブロック座標: X=${centerX}, Z=${centerZ}\n判定: ${chunk.isSlime ? "スライムチャンク" : "通常チャンク"}`,
  };
}

export function convertOverworldToNether(x, z) {
  return {
    x: Math.round(x / 8),
    z: Math.round(z / 8),
  };
}

export function convertNetherToOverworld(x, z) {
  return {
    x: x * 8,
    z: z * 8,
  };
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();

  if (!ok) {
    throw new Error("copy failed");
  }
}

export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
