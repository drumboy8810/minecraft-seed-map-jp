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

export function formatChunkDetails(chunk) {
  const xRange = chunkToBlockRange(chunk.x);
  const zRange = chunkToBlockRange(chunk.z);
  return {
    chunkText: `X=${chunk.x}, Z=${chunk.z}`,
    blockText: `X=${xRange.start}〜${xRange.end} / Z=${zRange.start}〜${zRange.end}`,
    resultText: chunk.isSlime ? "スライムチャンク" : "通常チャンク",
    copyText: `チャンク座標: X=${chunk.x}, Z=${chunk.z}\nブロック範囲: X=${xRange.start}〜${xRange.end}, Z=${zRange.start}〜${zRange.end}\n判定: ${chunk.isSlime ? "スライムチャンク" : "通常チャンク"}`,
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
