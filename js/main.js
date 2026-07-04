import { seedToJavaLong, isSlimeChunk } from "./slime.js";
import { addMemo, clearMemos, deleteMemo, loadMemos } from "./storage.js";
import { detectStructures } from "./structures/detector.js";
import { applyStructureLayer, getSourceLabel, getVisibleStructures } from "./structures/layer.js";
import { getTerrainProvider } from "./terrain.js";
import {
  blockToChunk,
  convertNetherToOverworld,
  convertOverworldToNether,
  copyText,
  formatChunkDetails,
  toInteger,
} from "./utils.js";

const BEDROCK_CANDIDATE_MESSAGE = "統合版は候補表示対応です。Java版とは別ロジックですが、現時点では同一候補ロジックを含み、結果は今後検証が必要です。";
const DEBUG_STRUCTURE_LAYER = false;
const VERSION_OPTIONS = {
  java: [
    ["java-1.21", "1.21"],
    ["java-1.20", "1.20"],
    ["java-1.19", "1.19"],
    ["java-1.18", "1.18"],
  ],
  bedrock: [
    ["bedrock-latest", "最新"],
    ["bedrock-1.21", "1.21系"],
    ["bedrock-1.20", "1.20系"],
  ],
};
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
  slimeLayerToggle: document.querySelector("#slime-layer-toggle"),
  terrainLayerToggle: document.querySelector("#terrain-layer-toggle"),
  terrainMode: document.querySelector("#terrain-mode-select"),
  terrainModeStatus: document.querySelector("#terrain-mode-status"),
  terrainLegend: document.querySelector("#terrain-legend"),
  autoStructureLayerToggle: document.querySelector("#auto-structure-layer-toggle"),
  manualMarkerLayerToggle: document.querySelector("#manual-marker-layer-toggle"),
  structureCandidateStatus: document.querySelector("#structure-candidate-status"),
  versionNote: document.querySelector("#version-note"),
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
let latestWorldSeed = null;

elements.form?.addEventListener("submit", (event) => {
  event.preventDefault();
  generateMap();
});

elements.jump?.addEventListener("click", () => {
  generateMap("指定座標へ移動しました。");
});

elements.origin?.addEventListener("click", () => {
  moveMapTo(0, 0, "原点へ戻りました。");
});

elements.reset?.addEventListener("click", () => {
  elements.seed.value = "";
  elements.edition.value = "java";
  renderVersionOptions("java", "java-1.21");
  updateVersionNote();
  elements.centerX.value = "0";
  elements.centerZ.value = "0";
  elements.radius.value = "32";
  clearSelectedChunk();
  elements.grid.innerHTML = "";
  latestWorldSeed = null;
  elements.summary.textContent = "条件を入力してマップを生成してください。";
  updateCenterStatus(null);
  setMessage("初期値に戻しました。", "success");
});

elements.edition?.addEventListener("change", () => {
  renderVersionOptions(getValue(elements.edition, "java"));
  updateVersionNote();
  regenerateMapIfReady("エディションを切り替えて再描画しました。");
});

elements.version?.addEventListener("change", () => {
  updateVersionNote();
  regenerateMapIfReady("バージョンを切り替えて再描画しました。");
});

elements.copyChunk?.addEventListener("click", () => copySelectedText(latestChunkCopyText, "チャンク座標をコピーしました。"));
elements.copyCenter?.addEventListener("click", () => copySelectedText(latestCenterCopyText, "中心ブロック座標をコピーしました。"));
elements.copyRange?.addEventListener("click", () => copySelectedText(latestRangeCopyText, "ブロック範囲をコピーしました。"));

elements.usePoint?.addEventListener("click", () => {
  if (!latestCenterPoint) {
    setMessage("地点登録に使うチャンクを選択してください。", "error");
    return;
  }
  elements.memoX.value = String(latestCenterPoint.x);
  elements.memoZ.value = String(latestCenterPoint.z);
  elements.memoTitle.focus();
  setMessage("選択チャンクの中心座標を地点登録フォームに入れました。", "success");
});

elements.converterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  convertCoordinates();
});

elements.memoForm?.addEventListener("submit", (event) => {
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

elements.clearMemos?.addEventListener("click", () => {
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

elements.memoList?.addEventListener("click", (event) => {
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

elements.memoSearch?.addEventListener("input", () => {
  renderMemos();
  applyMemoMarkers();
});

elements.memoCategorySearch?.addEventListener("input", () => {
  renderMemos();
  applyMemoMarkers();
});

elements.memoFilterGroup?.addEventListener("change", (event) => {
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

elements.slimeLayerToggle?.addEventListener("change", () => {
  updateSlimeLayerToggleLabel();
  applySlimeLayerDisplay();
});

elements.autoStructureLayerToggle?.addEventListener("change", () => {
  updateAutoStructureLayerToggleLabel();
  applyMemoMarkers();
});

elements.manualMarkerLayerToggle?.addEventListener("change", () => {
  updateManualMarkerLayerToggleLabel();
  applyMemoMarkers();
});

elements.terrainLayerToggle?.addEventListener("change", () => {
  updateTerrainLayerToggleLabel();
  applyTerrainLayer();
});

elements.terrainMode?.addEventListener("change", () => {
  updateTerrainModeStatus();
  renderTerrainLegend();
  applyTerrainLayer();
});

renderVersionOptions(getValue(elements.edition, "java"), getValue(elements.version, "java-1.21"));
renderCategoryFilters();
updateSlimeLayerToggleLabel();
updateTerrainLayerToggleLabel();
updateTerrainModeStatus();
renderTerrainLegend();
updateAutoStructureLayerToggleLabel();
updateManualMarkerLayerToggleLabel();
updateVersionNote();
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
  latestWorldSeed = worldSeed;
  latestAutoStructures = detectStructures({
    seed: worldSeed,
    edition,
    version: elements.version.value,
    centerX,
    centerZ,
    radius,
  });
  if (DEBUG_STRUCTURE_LAYER && !latestAutoStructures.length) {
    console.warn("構造物候補: 表示範囲内に自動候補がありません。", {
      edition,
      version: getValue(elements.version),
      centerX,
      centerZ,
      radius,
    });
  }
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
  applySlimeLayerDisplay();
  applyTerrainLayer();
  applyMemoMarkers();
  const editionLabel = edition === "bedrock" ? "統合版" : "Java版";
  const editionNote = edition === "bedrock" ? ` ${BEDROCK_CANDIDATE_MESSAGE}` : "";
  const autoStructureCount = latestAutoStructures.length;
  const autoStructureNote = isChecked(elements.autoStructureLayerToggle)
    ? ` / 構造物候補 ${autoStructureCount}件（候補表示）`
    : "";
  const slimeNote = isChecked(elements.slimeLayerToggle) ? ` / スライム ${slimeCount}件` : " / スライム非表示";
  elements.summary.textContent = `${editionLabel} ${getSelectedVersionLabel()} / 中心チャンク X=${centerChunkX}, Z=${centerChunkZ} / ${diameter}×${diameter}${slimeNote}${autoStructureNote}。${editionNote}`;
  updateCenterStatus({ centerChunkX, centerChunkZ, centerX, centerZ });
  setMessage(edition === "bedrock" ? BEDROCK_CANDIDATE_MESSAGE : successMessage, "success");
}

function regenerateMapIfReady(message) {
  if (latestWorldSeed === null || !elements.grid.querySelector(".chunk-cell")) {
    return;
  }
  generateMap(message);
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
  if (!elements.memoList) {
    return;
  }
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

function applyTerrainLayer() {
  const cells = Array.from(elements.grid.querySelectorAll(".chunk-cell"));
  if (!cells.length || latestWorldSeed === null) {
    return;
  }
  const provider = getTerrainProvider(getValue(elements.terrainMode, "simple"));

  for (const cell of cells) {
    if (!isChecked(elements.terrainLayerToggle) || !provider.isAvailable) {
      cell.classList.remove("has-terrain");
      cell.style.removeProperty("--terrain-color");
      cell.dataset.terrain = "";
      continue;
    }

    const terrain = provider.getTerrainForChunk(latestWorldSeed, Number(cell.dataset.x), Number(cell.dataset.z));
    if (!terrain) {
      continue;
    }
    cell.classList.add("has-terrain");
    cell.style.setProperty("--terrain-color", terrain.color);
    cell.dataset.terrain = terrain.label;
  }
}

function applyMemoMarkers() {
  const visibleStructures = getVisibleStructureRecords();
  const stats = applyStructureLayer({
    grid: elements.grid,
    structures: visibleStructures,
  });
  updateStructureCandidateStatus(stats);
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
  if (!elements.memoFilterGroup) {
    return;
  }
  elements.memoFilterGroup.innerHTML = [
    '<label><input type="checkbox" value="all" checked> 全表示</label>',
    ...STRUCTURE_CATEGORIES.map((category) => `<label><input type="checkbox" value="${escapeHtml(category)}" checked> ${escapeHtml(category)}のみ</label>`),
  ].join("");
}

function getFilteredMemos() {
  const titleQuery = getValue(elements.memoSearch).trim().toLowerCase();
  const categoryQuery = getValue(elements.memoCategorySearch).trim().toLowerCase();
  const activeCategories = getActiveCategories();

  return loadMemos().filter((memo) => {
    const category = normalizeCategory(memo.type);
    const titleMatches = !titleQuery || String(memo.title || "").toLowerCase().includes(titleQuery);
    const categoryMatches = !categoryQuery || category.toLowerCase().includes(categoryQuery);
    return titleMatches && categoryMatches && activeCategories.has(category);
  });
}

function getActiveCategories() {
  if (!elements.memoFilterGroup) {
    return new Set(STRUCTURE_CATEGORIES);
  }
  const allFilter = elements.memoFilterGroup.querySelector('input[type="checkbox"][value="all"]');
  if (allFilter?.checked) {
    return new Set(STRUCTURE_CATEGORIES);
  }

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
    showManual: isChecked(elements.manualMarkerLayerToggle),
    showAuto: isChecked(elements.autoStructureLayerToggle),
  });
}

function updateStructureCandidateStatus(stats = { autoVisible: 0, manualVisible: 0 }) {
  if (!elements.structureCandidateStatus) {
    return;
  }
  const autoDetected = latestAutoStructures.length;
  const autoLayerOn = isChecked(elements.autoStructureLayerToggle);
  const visibleAuto = stats.autoVisible || 0;
  const visibleManual = stats.manualVisible || 0;

  if (!autoLayerOn) {
    elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / 自動候補レイヤーOFF`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  if (!autoDetected || !visibleAuto) {
    elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / 表示範囲内に候補がありません / 手動マーカー ${visibleManual}件`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    if (DEBUG_STRUCTURE_LAYER && autoDetected > 0) {
      console.warn("構造物候補: フィルタまたは表示範囲によりマップ上の自動候補が0件です。", {
        detected: autoDetected,
        visibleAuto,
        visibleManual,
      });
    }
    return;
  }

  elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / 表示中 ${visibleAuto}件 / 手動マーカー ${visibleManual}件`;
  elements.structureCandidateStatus.classList.toggle("is-empty", false);
}

function applySlimeLayerDisplay() {
  elements.grid.classList.toggle("hide-slime", !isChecked(elements.slimeLayerToggle));
}

function updateSlimeLayerToggleLabel() {
  const label = elements.slimeLayerToggle.closest(".layer-toggle")?.querySelector("span");
  if (!label) {
    return;
  }
  label.textContent = isChecked(elements.slimeLayerToggle) ? "スライムチャンク: ON" : "スライムチャンク: OFF";
}

function updateAutoStructureLayerToggleLabel() {
  const label = elements.autoStructureLayerToggle.closest(".layer-toggle")?.querySelector("span");
  if (!label) {
    return;
  }
  label.textContent = isChecked(elements.autoStructureLayerToggle) ? "構造物候補: ON" : "構造物候補: OFF";
}

function updateManualMarkerLayerToggleLabel() {
  const label = elements.manualMarkerLayerToggle.closest(".layer-toggle")?.querySelector("span");
  if (!label) {
    return;
  }
  label.textContent = isChecked(elements.manualMarkerLayerToggle) ? "手動マーカー: ON" : "手動マーカー: OFF";
}

function updateTerrainLayerToggleLabel() {
  const label = elements.terrainLayerToggle.closest(".layer-toggle")?.querySelector("span");
  if (!label) {
    return;
  }
  label.textContent = isChecked(elements.terrainLayerToggle) ? "簡易地形: ON" : "簡易地形: OFF";
}

function updateTerrainModeStatus() {
  if (!elements.terrainModeStatus) {
    return;
  }
  const provider = getTerrainProvider(getValue(elements.terrainMode, "simple"));
  elements.terrainModeStatus.textContent = provider.isAvailable
    ? "現在の地形モード: 簡易地形"
    : provider.unavailableMessage;
  elements.terrainModeStatus.classList.toggle("is-warning", !provider.isAvailable);
  if (!provider.isAvailable) {
    setMessage(provider.unavailableMessage, "error");
  }
}

function renderTerrainLegend() {
  if (!elements.terrainLegend) {
    return;
  }
  const provider = getTerrainProvider(getValue(elements.terrainMode, "simple"));
  const terrainTypes = provider.getLegend();
  if (!terrainTypes.length) {
    elements.terrainLegend.innerHTML = '<span>詳細バイオームの凡例は準備中です</span>';
    return;
  }
  elements.terrainLegend.innerHTML = terrainTypes
    .map((terrain) => `<span><i style="--terrain-color: ${terrain.color}"></i>${escapeHtml(terrain.label)}</span>`)
    .join("");
}

function renderVersionOptions(edition, selectedValue) {
  if (!elements.version) {
    return;
  }
  const options = VERSION_OPTIONS[edition] || VERSION_OPTIONS.java;
  const fallbackValue = options[0][0];
  const nextValue = options.some(([value]) => value === selectedValue) ? selectedValue : fallbackValue;
  elements.version.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  elements.version.value = nextValue;
}

function getSelectedVersionLabel() {
  if (!elements.version) {
    return "";
  }
  return elements.version.options[elements.version.selectedIndex]?.textContent || "";
}

function updateVersionNote() {
  if (!elements.versionNote) {
    return;
  }
  if (getValue(elements.edition) === "bedrock") {
    elements.versionNote.textContent = "対象: 統合版。最新 / 1.21系 / 1.20系 は現時点で同一候補ロジックです。候補表示として扱います。";
    return;
  }
  elements.versionNote.textContent = "対象: Java版。1.21 / 1.20 / 1.19 / 1.18 は現時点で同一候補ロジックです。";
}

function setCategoryFiltersChecked(checked) {
  if (!elements.memoFilterGroup) {
    return;
  }
  for (const input of elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]')) {
    input.checked = checked;
  }
}

function syncAllCategoryFilter() {
  if (!elements.memoFilterGroup) {
    return;
  }
  const filters = Array.from(elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]'));
  const all = filters.find((input) => input.value === "all");
  const categoryFilters = filters.filter((input) => input.value !== "all");
  if (!all) {
    return;
  }
  all.checked = categoryFilters.every((input) => input.checked);
}

function isChecked(element, fallback = true) {
  return element ? Boolean(element.checked) : fallback;
}

function getValue(element, fallback = "") {
  return element ? String(element.value ?? "") : fallback;
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
