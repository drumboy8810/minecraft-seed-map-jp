import { seedToJavaLong, isSlimeChunk } from "./slime.js";
import { addMemo, clearMemos, deleteMemo, loadMemos } from "./storage.js";
import { detectStructures } from "./structures/detector.js";
import { applyStructureLayer, getSourceLabel, getVisibleStructures } from "./structures/layer.js";
import {
  blockToChunk,
  convertNetherToOverworld,
  convertOverworldToNether,
  copyText,
  formatChunkDetails,
  toInteger,
} from "./utils.js";

const BEDROCK_EXPERIMENTAL_MESSAGE = "統合版のスライムチャンク判定はv1.5では実験的対応です。結果は今後検証が必要です。";
const STRUCTURE_CATEGORIES = [
  "村",
  "要塞",
  "廃ポータル",
  "海底神殿",
  "森の洋館",
  "ピリジャー前哨基地",
  "古代都市",
  "エンドポータル",
  "ネザー要塞",
  "砦の遺跡",
  "エンドシティ",
  "トライアルチャンバー",
  "スポナー",
  "その他",
];
const CATEGORY_COLORS = {
  "村": "#8be071",
  "要塞": "#e3bd64",
  "廃ポータル": "#b27cff",
  "海底神殿": "#58c7e6",
  "森の洋館": "#5fb36d",
  "ピリジャー前哨基地": "#ee796f",
  "古代都市": "#6f8cff",
  "エンドポータル": "#d58cff",
  "ネザー要塞": "#e35454",
  "砦の遺跡": "#d88a45",
  "エンドシティ": "#d6d0ff",
  "トライアルチャンバー": "#78d0b3",
  "スポナー": "#f0d66b",
  "その他": "#b9c7b0",
};

const elements = {
  form: document.querySelector("#map-form"),
  seed: document.querySelector("#seed-input"),
  edition: document.querySelector("#edition-select"),
  version: document.querySelector("#version-select"),
  centerX: document.querySelector("#center-x-input"),
  centerZ: document.querySelector("#center-z-input"),
  radius: document.querySelector("#radius-select"),
  jump: document.querySelector("#jump-button"),
  origin: document.querySelector("#origin-button"),
  reset: document.querySelector("#reset-button"),
  message: document.querySelector("#message"),
  grid: document.querySelector("#chunk-grid"),
  summary: document.querySelector("#map-summary"),
  centerStatus: document.querySelector("#center-status"),
  structureLayerToggle: document.querySelector("#structure-layer-toggle"),
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
  memoSearch: document.querySelector("#memo-search-input"),
  memoCategorySearch: document.querySelector("#memo-category-search-input"),
  memoFilterGroup: document.querySelector("#memo-filter-group"),
  memoList: document.querySelector("#memo-list"),
  clearMemos: document.querySelector("#clear-memos-button"),
};

let selectedChunk = null;
let latestChunkCopyText = "";
let latestCenterCopyText = "";
let latestRangeCopyText = "";
let latestCenterPoint = null;
let latestAutoStructures = [];

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateMap();
});

elements.jump.addEventListener("click", () => {
  generateMap("指定座標へ移動しました。");
});

elements.origin.addEventListener("click", () => {
  moveMapTo(0, 0, "原点へ戻りました。");
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
  updateCenterStatus(null);
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
  const moveButton = event.target.closest("[data-move-memo]");
  if (moveButton) {
    moveMapTo(Number(moveButton.dataset.x), Number(moveButton.dataset.z), "地点周辺へ移動しました。");
    return;
  }

  const button = event.target.closest("[data-delete-memo]");
  if (!button) {
    return;
  }
  deleteMemo(button.dataset.deleteMemo);
  renderMemos();
  applyMemoMarkers();
  setMessage("地点メモを削除しました。", "success");
});

elements.memoSearch.addEventListener("input", () => {
  renderMemos();
  applyMemoMarkers();
});

elements.memoCategorySearch.addEventListener("input", () => {
  renderMemos();
  applyMemoMarkers();
});

elements.memoFilterGroup.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.value === "all") {
    setCategoryFiltersChecked(target.checked);
  } else {
    syncAllCategoryFilter();
  }
  renderMemos();
  applyMemoMarkers();
});

elements.structureLayerToggle.addEventListener("change", () => {
  updateStructureLayerToggleLabel();
  applyMemoMarkers();
});

renderCategoryFilters();
updateStructureLayerToggleLabel();
renderMemos();

function moveMapTo(x, z, successMessage) {
  elements.centerX.value = String(x);
  elements.centerZ.value = String(z);
  generateMap(successMessage);
}

function generateMap(successMessage = "マップを生成しました。チャンクを選択すると詳細を確認できます。") {
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
  latestAutoStructures = detectStructures({
    seed: worldSeed,
    edition,
    version: elements.version.value,
    centerX,
    centerZ,
    radius,
  });
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
  updateCenterStatus({ centerChunkX, centerChunkZ, centerX, centerZ });
  setMessage(edition === "bedrock" ? BEDROCK_EXPERIMENTAL_MESSAGE : successMessage, "success");
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
    elements.memoType.value = "スポナー";
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
  const memos = getFilteredMemos();
  if (!memos.length) {
    elements.memoList.innerHTML = '<p class="empty-state">表示できる地点メモはありません。</p>';
    return;
  }

  elements.memoList.innerHTML = memos.map((memo) => `
    <article class="memo-card" style="--marker-color: ${getCategoryColor(memo.type)}">
      <div>
        <h3>${escapeHtml(memo.name || memo.title)}</h3>
        <div class="memo-meta">
          <span class="category-pill">${escapeHtml(normalizeCategory(memo.type))}</span>
          <span>X=${memo.x}, Z=${memo.z}</span>
          <span>${new Date(memo.createdAt).toLocaleString("ja-JP")}</span>
        </div>
        <p class="memo-body">${escapeHtml(memo.body || "メモ本文なし")}</p>
      </div>
      <div class="memo-actions">
        <button class="secondary-button" type="button" data-move-memo="${memo.id}" data-x="${memo.x}" data-z="${memo.z}">移動</button>
        <button class="danger-button" type="button" data-delete-memo="${memo.id}">削除</button>
      </div>
    </article>
  `).join("");
}

function updateCenterStatus(center) {
  if (!center) {
    elements.centerStatus.textContent = "中心チャンク: - / 中心ブロック: -";
    return;
  }
  elements.centerStatus.textContent = `中心チャンク: X=${center.centerChunkX}, Z=${center.centerChunkZ} / 中心ブロック: X=${center.centerX}, Z=${center.centerZ}`;
}

function applyMemoMarkers() {
  applyStructureLayer({
    grid: elements.grid,
    structures: getVisibleStructureRecords(),
  });
}

function getMarkerDetails(button) {
  const markerIds = button.dataset.markerIds ? button.dataset.markerIds.split(",").filter(Boolean) : [];
  if (!markerIds.length) {
    return "";
  }

  const memosById = new Map(getVisibleStructureRecords().map((memo) => [memo.id, memo]));
  const markerItems = markerIds
    .map((id) => memosById.get(id))
    .filter(Boolean)
    .map((memo) => `
      <article class="marker-detail">
        <h3>${escapeHtml(memo.name || memo.title)}</h3>
        <p>${escapeHtml(normalizeCategory(memo.type))} / ${escapeHtml(getSourceLabel(memo.source))} / X=${memo.x}, Z=${memo.z}</p>
        <p>${escapeHtml(memo.note || memo.body || "メモ本文なし")}</p>
      </article>
    `)
    .join("");

  return `<div><dt>地点メモ</dt><dd>${markerItems}</dd></div>`;
}

function renderCategoryFilters() {
  elements.memoFilterGroup.innerHTML = [
    '<label><input type="checkbox" value="all" checked> 全表示</label>',
    ...STRUCTURE_CATEGORIES.map((category) => `<label><input type="checkbox" value="${escapeHtml(category)}" checked> ${escapeHtml(category)}のみ</label>`),
  ].join("");
}

function getFilteredMemos() {
  const titleQuery = elements.memoSearch.value.trim().toLowerCase();
  const categoryQuery = elements.memoCategorySearch.value.trim().toLowerCase();
  const activeCategories = getActiveCategories();

  return loadMemos().filter((memo) => {
    const category = normalizeCategory(memo.type);
    const titleMatches = !titleQuery || String(memo.title || "").toLowerCase().includes(titleQuery);
    const categoryMatches = !categoryQuery || category.toLowerCase().includes(categoryQuery);
    return titleMatches && categoryMatches && activeCategories.has(category);
  });
}

function getActiveCategories() {
  const checked = Array.from(elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter((value) => value !== "all");
  return new Set(checked);
}

function getVisibleStructureRecords() {
  return getVisibleStructures({
    manualStructures: getFilteredMemos(),
    autoStructures: latestAutoStructures,
    activeCategories: getActiveCategories(),
    showLayer: elements.structureLayerToggle.checked,
  });
}

function updateStructureLayerToggleLabel() {
  const label = elements.structureLayerToggle.closest(".layer-toggle")?.querySelector("span");
  if (!label) {
    return;
  }
  label.textContent = elements.structureLayerToggle.checked ? "構造物レイヤー: ON" : "構造物レイヤー: OFF";
}

function setCategoryFiltersChecked(checked) {
  for (const input of elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]')) {
    input.checked = checked;
  }
}

function syncAllCategoryFilter() {
  const filters = Array.from(elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]'));
  const all = filters.find((input) => input.value === "all");
  const categoryFilters = filters.filter((input) => input.value !== "all");
  all.checked = categoryFilters.every((input) => input.checked);
}

function normalizeCategory(category) {
  return STRUCTURE_CATEGORIES.includes(category) ? category : "その他";
}

function getCategoryColor(category) {
  return CATEGORY_COLORS[normalizeCategory(category)] || CATEGORY_COLORS["その他"];
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
