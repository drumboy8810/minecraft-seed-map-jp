import { seedToJavaLong, isSlimeChunk } from "./slime.js";
import { addMemo, clearMemos, deleteMemo, loadMemos } from "./storage.js";
import {
  blockToChunk,
  convertNetherToOverworld,
  convertOverworldToNether,
  copyText,
  formatChunkDetails,
  toInteger,
} from "./utils.js";

const BEDROCK_EXPERIMENTAL_MESSAGE = "統合版のスライムチャンク判定はv1.3では実験的対応です。結果は今後検証が必要です。";

const elements = {
  form: document.querySelector("#map-form"),
  seed: document.querySelector("#seed-input"),
  edition: document.querySelector("#edition-select"),
  version: document.querySelector("#version-select"),
  centerX: document.querySelector("#center-x-input"),
  centerZ: document.querySelector("#center-z-input"),
  radius: document.querySelector("#radius-select"),
  reset: document.querySelector("#reset-button"),
  message: document.querySelector("#message"),
  grid: document.querySelector("#chunk-grid"),
  summary: document.querySelector("#map-summary"),
  details: document.querySelector("#chunk-details"),
  copyChunk: document.querySelector("#copy-chunk-button"),
  copyCenter: document.querySelector("#copy-center-button"),
  copyRange: document.querySelector("#copy-range-button"),
  usePoint: document.querySelector("#use-point-button"),
  converterForm: document.querySelector("#converter-form"),
  converterDirection: document.querySelector("#converter-direction"),
  converterX: document.querySelector("#converter-x-input"),
  converterZ: document.querySelector("#converter-z-input"),
  converterResult: document.querySelector("#converter-result"),
  memoForm: document.querySelector("#memo-form"),
  memoTitle: document.querySelector("#memo-title-input"),
  memoX: document.querySelector("#memo-x-input"),
  memoZ: document.querySelector("#memo-z-input"),
  memoType: document.querySelector("#memo-type-input"),
  memoBody: document.querySelector("#memo-body-input"),
  memoList: document.querySelector("#memo-list"),
  clearMemos: document.querySelector("#clear-memos-button"),
};

let selectedChunk = null;
let latestChunkCopyText = "";
let latestCenterCopyText = "";
let latestRangeCopyText = "";
let latestCenterPoint = null;

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateMap();
});

elements.reset.addEventListener("click", () => {
  elements.seed.value = "";
  elements.edition.value = "java";
  elements.version.value = "java-1.20";
  elements.centerX.value = "0";
  elements.centerZ.value = "0";
  elements.radius.value = "32";
  clearSelectedChunk();
  elements.grid.innerHTML = "";
  elements.summary.textContent = "条件を入力してマップを生成してください。";
  setMessage("初期値に戻しました。", "success");
});

elements.copyChunk.addEventListener("click", () => copySelectedText(latestChunkCopyText, "チャンク座標をコピーしました。"));
elements.copyCenter.addEventListener("click", () => copySelectedText(latestCenterCopyText, "中心ブロック座標をコピーしました。"));
elements.copyRange.addEventListener("click", () => copySelectedText(latestRangeCopyText, "ブロック範囲をコピーしました。"));

elements.usePoint.addEventListener("click", () => {
  if (!latestCenterPoint) {
    setMessage("地点登録に使うチャンクを選択してください。", "error");
    return;
  }
  elements.memoX.value = String(latestCenterPoint.x);
  elements.memoZ.value = String(latestCenterPoint.z);
  elements.memoTitle.focus();
  setMessage("選択チャンクの中心座標を地点登録フォームに入れました。", "success");
});

elements.converterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  convertCoordinates();
});

elements.memoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.memoTitle.value.trim();
  const x = toInteger(elements.memoX.value);
  const z = toInteger(elements.memoZ.value);

  if (!title) {
    setMessage("メモのタイトルを入力してください。", "error");
    return;
  }
  if (x === null || z === null) {
    setMessage("メモのX座標とZ座標には整数を入力してください。", "error");
    return;
  }

  addMemo({
    title,
    x,
    z,
    type: elements.memoType.value,
    body: elements.memoBody.value.trim(),
  });
  elements.memoForm.reset();
  renderMemos();
  applyMemoMarkers();
  setMessage("地点メモを保存しました。", "success");
});

elements.clearMemos.addEventListener("click", () => {
  if (!loadMemos().length) {
    setMessage("削除できるメモはありません。", "error");
    return;
  }
  if (confirm("すべての地点メモを削除しますか？")) {
    clearMemos();
    renderMemos();
    applyMemoMarkers();
    setMessage("地点メモをすべて削除しました。", "success");
  }
});

elements.memoList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-memo]");
  if (!button) {
    return;
  }
  deleteMemo(button.dataset.deleteMemo);
  renderMemos();
  applyMemoMarkers();
  setMessage("地点メモを削除しました。", "success");
});

renderMemos();

function generateMap() {
  const seedText = elements.seed.value.trim();
  const centerX = toInteger(elements.centerX.value);
  const centerZ = toInteger(elements.centerZ.value);
  const radius = toInteger(elements.radius.value);
  const edition = elements.edition.value;

  if (!seedText) {
    setMessage("シード値を入力してください。", "error");
    return;
  }
  if (centerX === null || centerZ === null) {
    setMessage("座標には整数を入力してください。", "error");
    return;
  }
  if (radius === null || radius < 1 || radius > 64) {
    setMessage("表示範囲が大きすぎます。64チャンク以内で指定してください。", "error");
    return;
  }

  const worldSeed = seedToJavaLong(seedText);
  const centerChunkX = blockToChunk(centerX);
  const centerChunkZ = blockToChunk(centerZ);
  const diameter = radius * 2 + 1;
  let slimeCount = 0;

  elements.grid.innerHTML = "";
  elements.grid.style.gridTemplateColumns = `repeat(${diameter}, 20px)`;
  clearSelectedChunk();

  const fragment = document.createDocumentFragment();
  for (let z = centerChunkZ - radius; z <= centerChunkZ + radius; z += 1) {
    for (let x = centerChunkX - radius; x <= centerChunkX + radius; x += 1) {
      const isSlime = isSlimeChunk(worldSeed, x, z, edition);
      if (isSlime) {
        slimeCount += 1;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chunk-cell";
      button.classList.toggle("is-slime", isSlime);
      button.classList.toggle("is-center", Math.abs(x - centerChunkX) <= 1 && Math.abs(z - centerChunkZ) <= 1);
      button.setAttribute("role", "gridcell");
      const ariaLabel = `チャンク X ${x}, Z ${z}, ${isSlime ? "スライムチャンク" : "通常チャンク"}`;
      button.setAttribute("aria-label", ariaLabel);
      button.dataset.x = String(x);
      button.dataset.z = String(z);
      button.dataset.slime = String(isSlime);
      button.dataset.baseLabel = ariaLabel;
      button.addEventListener("click", () => selectChunk(button));
      fragment.appendChild(button);
    }
  }

  elements.grid.appendChild(fragment);
  applyMemoMarkers();
  const editionLabel = edition === "bedrock" ? "統合版（実験的）" : "Java版";
  const editionNote = edition === "bedrock" ? ` ${BEDROCK_EXPERIMENTAL_MESSAGE}` : "";
  elements.summary.textContent = `${editionLabel} / 中心チャンク X=${centerChunkX}, Z=${centerChunkZ} / ${diameter}×${diameter} / スライム ${slimeCount}件。${editionNote}`;
  setMessage(edition === "bedrock" ? BEDROCK_EXPERIMENTAL_MESSAGE : "マップを生成しました。チャンクを選択すると詳細を確認できます。", "success");
}

function selectChunk(button) {
  elements.grid.querySelector(".is-selected")?.classList.remove("is-selected");
  button.classList.add("is-selected");

  selectedChunk = {
    x: Number(button.dataset.x),
    z: Number(button.dataset.z),
    isSlime: button.dataset.slime === "true",
  };

  const details = formatChunkDetails(selectedChunk);
  latestChunkCopyText = details.chunkCopyText;
  latestCenterCopyText = details.centerCopyText;
  latestRangeCopyText = details.rangeCopyText;
  latestCenterPoint = {
    x: selectedChunk.x * 16 + 8,
    z: selectedChunk.z * 16 + 8,
  };
  const markerDetails = getMarkerDetails(button);
  elements.details.innerHTML = `
    <div><dt>チャンク座標</dt><dd>${details.chunkText}</dd></div>
    <div><dt>ブロック範囲</dt><dd>${details.blockText}</dd></div>
    <div><dt>中心ブロック座標</dt><dd>${details.centerText}</dd></div>
    <div><dt>判定</dt><dd>${details.resultText}</dd></div>
    ${markerDetails}
  `;
  setCopyButtonsDisabled(false);
  if (selectedChunk.isSlime) {
    elements.memoType.value = "トラップ予定地";
  }
}

function clearSelectedChunk() {
  selectedChunk = null;
  latestChunkCopyText = "";
  latestCenterCopyText = "";
  latestRangeCopyText = "";
  latestCenterPoint = null;
  setCopyButtonsDisabled(true);
  elements.details.innerHTML = `
    <div><dt>チャンク座標</dt><dd>-</dd></div>
    <div><dt>ブロック範囲</dt><dd>-</dd></div>
    <div><dt>中心ブロック座標</dt><dd>-</dd></div>
    <div><dt>判定</dt><dd>-</dd></div>
  `;
}

function convertCoordinates() {
  const x = toInteger(elements.converterX.value);
  const z = toInteger(elements.converterZ.value);

  if (x === null || z === null) {
    elements.converterResult.textContent = "変換結果: X/Zには整数を入力してください。";
    setMessage("ネザー座標変換のX/Zには整数を入力してください。", "error");
    return;
  }

  const isOverworldToNether = elements.converterDirection.value === "overworld-to-nether";
  const converted = isOverworldToNether
    ? convertOverworldToNether(x, z)
    : convertNetherToOverworld(x, z);
  const label = isOverworldToNether ? "ネザー" : "オーバーワールド";

  elements.converterResult.textContent = `変換結果: ${label} X=${converted.x}, Z=${converted.z}`;
  setMessage("座標を変換しました。", "success");
}

async function copySelectedText(text, successMessage) {
  try {
    await copyText(text);
    setMessage(successMessage, "success");
  } catch {
    setMessage("クリップボードへのコピーに失敗しました。手動で選択してコピーしてください。", "error");
  }
}

function setCopyButtonsDisabled(disabled) {
  elements.copyChunk.disabled = disabled;
  elements.copyCenter.disabled = disabled;
  elements.copyRange.disabled = disabled;
  elements.usePoint.disabled = disabled;
}

function renderMemos() {
  const memos = loadMemos();
  if (!memos.length) {
    elements.memoList.innerHTML = '<p class="empty-state">保存済みの地点メモはありません。</p>';
    return;
  }

  elements.memoList.innerHTML = memos.map((memo) => `
    <article class="memo-card">
      <div>
        <h3>${escapeHtml(memo.title)}</h3>
        <div class="memo-meta">
          <span>${escapeHtml(memo.type)}</span>
          <span>X=${memo.x}, Z=${memo.z}</span>
          <span>${new Date(memo.createdAt).toLocaleString("ja-JP")}</span>
        </div>
        <p class="memo-body">${escapeHtml(memo.body || "メモ本文なし")}</p>
      </div>
      <button class="danger-button" type="button" data-delete-memo="${memo.id}">削除</button>
    </article>
  `).join("");
}

function applyMemoMarkers() {
  const cells = Array.from(elements.grid.querySelectorAll(".chunk-cell"));
  if (!cells.length) {
    return;
  }

  const markersByChunk = new Map();
  for (const memo of loadMemos()) {
    const chunkX = blockToChunk(memo.x);
    const chunkZ = blockToChunk(memo.z);
    const key = `${chunkX},${chunkZ}`;
    const markers = markersByChunk.get(key) || [];
    markers.push(memo);
    markersByChunk.set(key, markers);
  }

  for (const cell of cells) {
    const key = `${cell.dataset.x},${cell.dataset.z}`;
    const markers = markersByChunk.get(key) || [];
    cell.classList.toggle("has-marker", markers.length > 0);
    cell.dataset.markerIds = markers.map((marker) => marker.id).join(",");
    if (markers.length) {
      cell.setAttribute("aria-label", `${cell.dataset.baseLabel}、地点メモ ${markers.length}件`);
      cell.title = markers.map((marker) => `${marker.title} (${marker.type})`).join("\n");
    } else {
      cell.setAttribute("aria-label", cell.dataset.baseLabel);
      cell.removeAttribute("title");
    }
  }
}

function getMarkerDetails(button) {
  const markerIds = button.dataset.markerIds ? button.dataset.markerIds.split(",").filter(Boolean) : [];
  if (!markerIds.length) {
    return "";
  }

  const memosById = new Map(loadMemos().map((memo) => [memo.id, memo]));
  const markerItems = markerIds
    .map((id) => memosById.get(id))
    .filter(Boolean)
    .map((memo) => `
      <article class="marker-detail">
        <h3>${escapeHtml(memo.title)}</h3>
        <p>${escapeHtml(memo.type)} / X=${memo.x}, Z=${memo.z}</p>
        <p>${escapeHtml(memo.body || "メモ本文なし")}</p>
      </article>
    `)
    .join("");

  return `<div><dt>地点メモ</dt><dd>${markerItems}</dd></div>`;
}

function setMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
