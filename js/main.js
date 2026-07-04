import { seedToJavaLong, isSlimeChunk } from "./slime.js?v=7.0.0";
import { addMemo, clearMemos, deleteMemo, loadMemos } from "./storage.js?v=7.0.0";
import { MapEngine } from "./map/map-engine.js?v=7.0.0";
import { getStructureCacheStats, getStructuresInView } from "./map/structure-provider.js?v=7.0.0";
import { getEditionLabel, getSourceLabel, getVisibleStructures } from "./structures/layer.js?v=7.0.0";
import { STRUCTURE_CATEGORIES, getCategoryColor, getCategorySymbol, normalizeStructureCategory } from "./structures/config.js?v=7.0.0";
import { getBiomeAt as getProviderBiomeAt, getProviderStatus, getPrecisionModeOptions, loadAccurateProviders, normalizePrecisionMode } from "./providers/provider-manager.js?v=7.0.0";
import { getTerrainProvider } from "./terrain.js?v=7.0.0";
import {
  blockToChunk,
  blockToRegion,
  chunkToRegion,
  convertNetherToOverworld,
  convertOverworldToNether,
  copyText,
  formatChunkDetails,
  toInteger,
} from "./utils.js?v=7.0.0";

const BEDROCK_CANDIDATE_MESSAGE = "Bedrock正確生成は未対応です。プレビュー生成を選んだ場合のみ、実ワールドと一致しない疑似表示を行います。";
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
  canvas: document.querySelector("#map-canvas"),
  summary: document.querySelector("#map-summary"),
  centerStatus: document.querySelector("#center-status"),
  slimeLayerToggle: document.querySelector("#slime-layer-toggle"),
  terrainLayerToggle: document.querySelector("#terrain-layer-toggle"),
  chunkGridToggle: document.querySelector("#chunk-grid-toggle"),
  regionGridToggle: document.querySelector("#region-grid-toggle"),
  terrainMode: document.querySelector("#terrain-mode-select"),
  precisionMode: document.querySelector("#precision-mode-select"),
  terrainModeStatus: document.querySelector("#terrain-mode-status"),
  terrainLegend: document.querySelector("#terrain-legend"),
  autoStructureLayerToggle: document.querySelector("#auto-structure-layer-toggle"),
  manualMarkerLayerToggle: document.querySelector("#manual-marker-layer-toggle"),
  centerMarkerLayerToggle: document.querySelector("#center-marker-layer-toggle"),
  structureCandidateStatus: document.querySelector("#structure-candidate-status"),
  zoomStatus: document.querySelector("#zoom-status"),
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

const NEARBY_SECTION_STORAGE_KEY = "minecraft-seed-map-jp:nearby-structures-open";
const NEARBY_STRUCTURE_LIMIT = 10;
const NEARBY_STRUCTURE_DISTANCE = 768;

let selectedChunk = null;
let latestChunkCopyText = "";
let latestCenterCopyText = "";
let latestRangeCopyText = "";
let latestCenterPoint = null;
let latestAutoStructures = [];
let latestWorldSeed = null;
let latestEdition = "java";
let latestVersion = "java-1.21";
let latestPrecisionMode = "accurate";
let mapEngine = null;
let latestSelectedMarkers = [];
let nearbyStructuresOpen = readNearbySectionState();

if (elements.canvas) {
  mapEngine = new MapEngine(elements.canvas, {
    onSelect: selectMapPoint,
    onViewChange(centerX, centerZ, meta) {
      if (elements.centerX) elements.centerX.value = String(Math.round(centerX));
      if (elements.centerZ) elements.centerZ.value = String(Math.round(centerZ));
      updateCenterStatus({
        centerChunkX: blockToChunk(centerX),
        centerChunkZ: blockToChunk(centerZ),
        centerX: Math.round(centerX),
        centerZ: Math.round(centerZ),
      });
      if (!meta.live) {
        generateMap("表示位置を更新しました。");
      }
    },
    onZoomChange(label) {
      setText(elements.zoomStatus, `ズーム: ${label}`);
      setMessage(`ズーム: ${label}`, "success");
    },
  });
  setText(elements.zoomStatus, `ズーム: ${mapEngine.getZoomStatus()}`);
}

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
  if (elements.seed) elements.seed.value = "";
  if (elements.edition) elements.edition.value = "java";
  renderVersionOptions("java", "java-1.21");
  updateVersionNote();
  if (elements.centerX) elements.centerX.value = "0";
  if (elements.centerZ) elements.centerZ.value = "0";
  if (elements.radius) elements.radius.value = "32";
  clearSelectedChunk();
  latestAutoStructures = [];
  latestWorldSeed = null;
  latestEdition = "java";
  latestVersion = "java-1.21";
  latestPrecisionMode = "accurate";
  renderPrecisionModeOptions("java", "accurate");
  updateMapEngine();
  setText(elements.summary, "条件を入力してマップを生成してください。");
  updateCenterStatus(null);
  setMessage("初期値に戻しました。", "success");
});

elements.edition?.addEventListener("change", () => {
  const edition = getValue(elements.edition, "java");
  renderVersionOptions(edition);
  renderPrecisionModeOptions(edition, getValue(elements.precisionMode, "accurate"));
  updateVersionNote();
  regenerateMapIfReady("エディションを切り替えて再描画しました。");
});

elements.version?.addEventListener("change", () => {
  updateVersionNote();
  regenerateMapIfReady("バージョンを切り替えて再描画しました。");
});

elements.precisionMode?.addEventListener("change", async () => {
  latestPrecisionMode = normalizePrecisionMode(getValue(elements.precisionMode, latestPrecisionMode));
  if (getValue(elements.edition, "java") === "java" && getValue(elements.precisionMode, "preview") === "accurate") {
    await loadAccurateProviders();
  }
  updateLayerToggleLabels();
  updateTerrainModeStatus();
  regenerateMapIfReady("精度モードを切り替えて再描画しました。");
});

elements.copyChunk?.addEventListener("click", () => copySelectedText(latestChunkCopyText, "チャンク座標をコピーしました。"));
elements.copyCenter?.addEventListener("click", () => copySelectedText(latestCenterCopyText, "中心ブロック座標をコピーしました。"));
elements.copyRange?.addEventListener("click", () => copySelectedText(latestRangeCopyText, "ブロック範囲をコピーしました。"));

elements.usePoint?.addEventListener("click", () => {
  if (!latestCenterPoint) {
    setMessage("地点登録に使うチャンクを選択してください。", "error");
    return;
  }
  if (elements.memoX) elements.memoX.value = String(latestCenterPoint.x);
  if (elements.memoZ) elements.memoZ.value = String(latestCenterPoint.z);
  elements.memoTitle?.focus();
  setMessage("選択チャンクの中心座標を地点登録フォームに入れました。", "success");
});

elements.details?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const toggle = target.closest("[data-toggle-nearby-structures]");
  if (!toggle) return;
  nearbyStructuresOpen = !nearbyStructuresOpen;
  writeNearbySectionState(nearbyStructuresOpen);
  renderSelectedChunkDetails();
});

elements.converterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  convertCoordinates();
});

elements.memoForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = getValue(elements.memoTitle).trim();
  const x = toInteger(getValue(elements.memoX));
  const z = toInteger(getValue(elements.memoZ));

  if (!title) {
    setMessage("地点名を入力してください。", "error");
    return;
  }
  if (x === null || z === null) {
    setMessage("地点メモのX座標とZ座標には整数を入力してください。", "error");
    return;
  }

  addMemo({
    title,
    x,
    z,
    type: getValue(elements.memoType, "その他"),
    body: getValue(elements.memoBody).trim(),
  });
  elements.memoForm.reset();
  renderMemos();
  updateMapEngine();
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
    updateMapEngine();
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
  if (!button) return;
  deleteMemo(button.dataset.deleteMemo);
  renderMemos();
  updateMapEngine();
  setMessage("地点メモを削除しました。", "success");
});

elements.memoSearch?.addEventListener("input", () => {
  renderMemos();
  updateMapEngine();
});

elements.memoCategorySearch?.addEventListener("input", () => {
  renderMemos();
  updateMapEngine();
});

elements.memoFilterGroup?.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.value === "all") {
    setCategoryFiltersChecked(target.checked);
  } else {
    syncAllCategoryFilter();
  }
  renderMemos();
  updateMapEngine();
});

elements.slimeLayerToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.autoStructureLayerToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.manualMarkerLayerToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.centerMarkerLayerToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.terrainLayerToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.chunkGridToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.regionGridToggle?.addEventListener("change", () => {
  updateLayerToggleLabels();
  updateMapEngine();
});

elements.terrainMode?.addEventListener("change", () => {
  updateTerrainModeStatus();
  renderTerrainLegend();
  updateMapEngine();
});

renderVersionOptions(getValue(elements.edition, "java"), getValue(elements.version, "java-1.21"));
renderPrecisionModeOptions(getValue(elements.edition, "java"), getValue(elements.precisionMode, "accurate"));
renderCategoryFilters();
renderMemoTypeOptions();
updateLayerToggleLabels();
updateTerrainModeStatus();
renderTerrainLegend();
updateVersionNote();
renderMemos();
clearSelectedChunk();
updateMapEngine();

function moveMapTo(x, z, successMessage) {
  if (elements.centerX) elements.centerX.value = String(x);
  if (elements.centerZ) elements.centerZ.value = String(z);
  generateMap(successMessage);
}

function generateMap(successMessage = "マップを生成しました。チャンクや構造物アイコンをクリックすると詳細を確認できます。") {
  const seedText = getValue(elements.seed).trim();
  const centerX = toInteger(getValue(elements.centerX));
  const centerZ = toInteger(getValue(elements.centerZ));
  const radius = toInteger(getValue(elements.radius));
  const edition = getValue(elements.edition, "java");

  if (!seedText) {
    setMessage("シード値を入力してください。", "error");
    return;
  }
  if (centerX === null || centerZ === null) {
    setMessage("中心座標には整数を入力してください。", "error");
    return;
  }
  if (radius === null || radius < 1 || radius > 128) {
    setMessage("表示範囲は1〜128チャンクで指定してください。", "error");
    return;
  }

  const worldSeed = seedToJavaLong(seedText);
  latestWorldSeed = worldSeed;
  latestEdition = edition;
  latestVersion = getValue(elements.version);
  latestPrecisionMode = normalizePrecisionMode(getValue(elements.precisionMode, "accurate"));
  latestAutoStructures = getStructuresInView({
    seed: worldSeed,
    edition,
    version: latestVersion,
    centerX,
    centerZ,
    radius,
    mode: latestPrecisionMode,
  });

  const centerChunkX = blockToChunk(centerX);
  const centerChunkZ = blockToChunk(centerZ);
  const diameter = radius * 2 + 1;
  let slimeCount = 0;
  clearSelectedChunk();
  for (let z = centerChunkZ - radius; z <= centerChunkZ + radius; z += 1) {
    for (let x = centerChunkX - radius; x <= centerChunkX + radius; x += 1) {
      if (isSlimeChunk(worldSeed, x, z, edition)) slimeCount += 1;
    }
  }

  updateMapEngine();
  const editionLabel = edition === "bedrock" ? "統合版" : "Java版";
  const editionNote = edition === "bedrock" ? ` ${BEDROCK_CANDIDATE_MESSAGE}` : "";
  const slimeNote = isChecked(elements.slimeLayerToggle) ? ` / スライム ${slimeCount}件` : " / スライム非表示";
  const structureNote = isChecked(elements.autoStructureLayerToggle) ? ` / 構造物候補 ${latestAutoStructures.length}件` : " / 構造物候補非表示";
  setText(
    elements.summary,
    `${editionLabel} ${getSelectedVersionLabel()} / 中心チャンク X=${centerChunkX}, Z=${centerChunkZ} / ${diameter}×${diameter}${slimeNote}${structureNote}。${editionNote}`,
  );
  updateCenterStatus({ centerChunkX, centerChunkZ, centerX, centerZ });
  updateTerrainModeStatus();
  const providerStatus = getProviderStatus({ mode: latestPrecisionMode, edition });
  setMessage(
    providerStatus.unavailable || providerStatus.fallback
      ? providerStatus.message
      : (edition === "bedrock" ? BEDROCK_CANDIDATE_MESSAGE : successMessage),
    providerStatus.unavailable || providerStatus.fallback ? "error" : "success",
  );
}

function regenerateMapIfReady(message) {
  if (latestWorldSeed === null) return;
  generateMap(message);
}

function selectMapPoint(selection) {
  selectedChunk = {
    x: selection.chunkX,
    z: selection.chunkZ,
    blockX: selection.blockX,
    blockZ: selection.blockZ,
    canvasX: selection.canvasX,
    canvasY: selection.canvasY,
    isSlime: isSlimeChunk(latestWorldSeed || 0n, selection.chunkX, selection.chunkZ, latestEdition),
  };
  latestSelectedMarkers = selection.markers || [];

  const details = formatChunkDetails(selectedChunk);
  latestChunkCopyText = details.chunkCopyText;
  latestCenterCopyText = details.centerCopyText;
  latestRangeCopyText = details.rangeCopyText;
  latestCenterPoint = {
    x: selectedChunk.x * 16 + 8,
    z: selectedChunk.z * 16 + 8,
  };
  const netherPoint = convertOverworldToNether(latestCenterPoint.x, latestCenterPoint.z);
  const markerDetails = "";
  const nearbyDetails = "";
  if (false && elements.details) {
    elements.details.innerHTML = `
      <div><dt>チャンク座標</dt><dd>${details.chunkText}</dd></div>
      <div><dt>ブロック範囲</dt><dd>${details.blockText}</dd></div>
      <div><dt>中心ブロック座標</dt><dd>${details.centerText}</dd></div>
      <div><dt>ネザー換算</dt><dd>X=${netherPoint.x}, Z=${netherPoint.z}</dd></div>
      <div><dt>判定</dt><dd>${details.resultText}</dd></div>
      ${markerDetails}
      ${nearbyDetails}
    `;
  }
  renderSelectedChunkDetails();
  setCopyButtonsDisabled(false);
  if (selectedChunk.isSlime && elements.memoType) {
    elements.memoType.value = "スポナー";
  }
}

function clearSelectedChunk() {
  selectedChunk = null;
  latestChunkCopyText = "";
  latestCenterCopyText = "";
  latestRangeCopyText = "";
  latestCenterPoint = null;
  latestSelectedMarkers = [];
  setCopyButtonsDisabled(true);
  if (elements.details) {
    elements.details.innerHTML = `
      <div><dt>チャンク座標</dt><dd>-</dd></div>
      <div><dt>ブロック範囲</dt><dd>-</dd></div>
      <div><dt>中心ブロック座標</dt><dd>-</dd></div>
      <div><dt>ネザー換算</dt><dd>-</dd></div>
      <div><dt>判定</dt><dd>-</dd></div>
    `;
  }
  renderEmptyDetails();
}

function renderEmptyDetails() {
  if (!elements.details) return;
  const centerBlockX = toInteger(getValue(elements.centerX)) ?? 0;
  const centerBlockZ = toInteger(getValue(elements.centerZ)) ?? 0;
  const centerChunkX = blockToChunk(centerBlockX);
  const centerChunkZ = blockToChunk(centerBlockZ);
  const coordinateDebug = getCoordinateDebugDetails({
    x: centerChunkX,
    z: centerChunkZ,
    blockX: centerBlockX,
    blockZ: centerBlockZ,
  });
  const providerDetails = getProviderDetails();
  elements.details.innerHTML = `
    <div class="detail-section">
      <dt>選択地点</dt>
      <dd>マップをクリックすると、クリック地点の座標と周辺情報を表示します。未選択時は中心座標を表示します。</dd>
    </div>
    ${coordinateDebug}
    ${providerDetails}
    <div class="detail-section">
      <dt>判定情報</dt>
      <dd>-</dd>
    </div>
    <div class="detail-section detail-section--nearby">
      <dt>${getNearbyStructureTitle()}（0件）</dt>
      <dd>マップ選択後に確認できます。</dd>
    </div>
    <div class="detail-section">
      <dt>メモ/マーカー</dt>
      <dd>選択後に「この座標を地点登録に使う」から登録できます。</dd>
    </div>
  `;
}

function renderSelectedChunkDetails() {
  if (!elements.details || !selectedChunk || !latestCenterPoint) return;

  const details = formatChunkDetails(selectedChunk);
  const netherPoint = convertOverworldToNether(latestCenterPoint.x, latestCenterPoint.z);
  const terrainText = getSelectedTerrainText(selectedChunk);
  const coordinateDebug = getCoordinateDebugDetails(selectedChunk);
  const providerDetails = getProviderDetails();
  const markerDetails = getSelectedMarkerDetailsV52(latestSelectedMarkers);
  const nearbyDetails = getNearbyCandidateDetailsV52(selectedChunk);

  elements.details.innerHTML = `
    <div class="detail-section">
      <dt>選択地点</dt>
      <dd>
        <dl class="detail-sublist">
          <div><dt>チャンク座標</dt><dd>${details.chunkText}</dd></div>
          <div><dt>ブロック範囲</dt><dd>${details.blockText}</dd></div>
          <div><dt>中心ブロック座標</dt><dd>${details.centerText}</dd></div>
          <div><dt>クリックブロック座標</dt><dd>X=${selectedChunk.blockX}, Z=${selectedChunk.blockZ}</dd></div>
          <div><dt>バイオーム/地形</dt><dd>${escapeHtml(terrainText)}</dd></div>
        </dl>
      </dd>
    </div>
    ${coordinateDebug}
    ${providerDetails}
    <div class="detail-section">
      <dt>判定情報</dt>
      <dd>
        <dl class="detail-sublist">
          <div><dt>スライムチャンク</dt><dd>${details.resultText}</dd></div>
          <div><dt>ネザー座標</dt><dd>X=${netherPoint.x}, Z=${netherPoint.z}</dd></div>
        </dl>
      </dd>
    </div>
    ${nearbyDetails}
    ${markerDetails}
  `;
}

function getSelectedMarkerDetailsV52(markers) {
  if (!markers.length) {
    return `
      <div class="detail-section">
        <dt>メモ/マーカー</dt>
        <dd>この地点に重なる手動マーカーや構造物候補はありません。</dd>
      </div>
    `;
  }

  const markerItems = markers.map((marker) => renderCompactStructureItem(marker, 0, true)).join("");
  return `
    <div class="detail-section">
      <dt>メモ/マーカー</dt>
      <dd><div class="nearby-list">${markerItems}</div></dd>
    </div>
  `;
}

function getCoordinateDebugDetails(chunk) {
  const blockX = Number.isFinite(chunk.blockX) ? chunk.blockX : chunk.x * 16 + 8;
  const blockZ = Number.isFinite(chunk.blockZ) ? chunk.blockZ : chunk.z * 16 + 8;
  const chunkX = blockToChunk(blockX);
  const chunkZ = blockToChunk(blockZ);
  const regionX = blockToRegion(blockX);
  const regionZ = blockToRegion(blockZ);
  const structureRegionX = chunkToRegion(chunk.x);
  const structureRegionZ = chunkToRegion(chunk.z);

  return `
    <div class="detail-section">
      <dt>座標デバッグ</dt>
      <dd>
        <dl class="detail-sublist">
          <div><dt>block</dt><dd>X=${blockX}, Z=${blockZ}</dd></div>
          <div><dt>chunk</dt><dd>X=${chunkX}, Z=${chunkZ}</dd></div>
          <div><dt>region</dt><dd>X=${regionX}, Z=${regionZ}（32チャンク単位）</dd></div>
          <div><dt>canvas</dt><dd>X=${Number.isFinite(chunk.canvasX) ? chunk.canvasX : "-"}, Y=${Number.isFinite(chunk.canvasY) ? chunk.canvasY : "-"}</dd></div>
          <div><dt>選択チャンクのregion</dt><dd>X=${structureRegionX}, Z=${structureRegionZ}</dd></div>
        </dl>
      </dd>
    </div>
  `;
}

function getProviderDetails() {
  const status = getProviderStatus({ mode: latestPrecisionMode, edition: latestEdition });
  const modeLabel = latestPrecisionMode === "accurate" ? "正確生成" : "プレビュー生成";
  const activeLabel = status.activeMode === "accurate" ? "正確生成" : "プレビュー生成";

  return `
    <div class="detail-section">
      <dt>生成provider</dt>
      <dd>
        <dl class="detail-sublist">
          <div><dt>選択モード</dt><dd>${escapeHtml(modeLabel)}</dd></div>
          <div><dt>実行モード</dt><dd>${escapeHtml(activeLabel)}${status.fallback ? "（フォールバック）" : ""}</dd></div>
          <div><dt>バイオームprovider</dt><dd>${escapeHtml(status.biomeProviderName)} / ${escapeHtml(status.biomeProviderId)}</dd></div>
          <div><dt>構造物provider</dt><dd>${escapeHtml(status.structureProviderName)} / ${escapeHtml(status.structureProviderId)}</dd></div>
          <div><dt>状態</dt><dd>${escapeHtml(status.message)}</dd></div>
        </dl>
      </dd>
    </div>
  `;
}

function getNearbyCandidateDetailsV52(chunk) {
  const chunkCenterX = chunk.x * 16 + 8;
  const chunkCenterZ = chunk.z * 16 + 8;
  const nearbyStructures = getVisibleStructureRecords()
    .filter((structure) => structure.source === "auto")
    .map((structure) => ({
      ...structure,
      distance: Math.hypot(structure.x - chunkCenterX, structure.z - chunkCenterZ),
    }))
    .filter((structure) => structure.distance <= NEARBY_STRUCTURE_DISTANCE)
    .sort((a, b) => a.distance - b.distance);

  const total = nearbyStructures.length;
  const visibleItems = nearbyStructures.slice(0, NEARBY_STRUCTURE_LIMIT);
  const hiddenCount = Math.max(0, total - visibleItems.length);
  const expanded = nearbyStructuresOpen;
  const buttonLabel = expanded ? "閉じる" : "開く";
  const listHtml = total
    ? visibleItems.map((structure) => renderCompactStructureItem(structure, structure.distance)).join("")
    : `<p class="empty-state compact">${getNearbyStructureTitle()}はありません。</p>`;
  const moreHtml = hiddenCount
    ? `<p class="nearby-more">他 ${hiddenCount}件は距離が遠いため省略しています。</p>`
    : "";

  return `
    <div class="detail-section detail-section--nearby">
      <dt>
        <button class="nearby-toggle" type="button" data-toggle-nearby-structures aria-expanded="${expanded}">
          <span>${getNearbyStructureTitle()}（${total}件）</span>
          <span class="nearby-toggle__state">${buttonLabel}</span>
        </button>
      </dt>
      <dd class="nearby-content" ${expanded ? "" : "hidden"}>
        <div class="nearby-list">${listHtml}</div>
        ${moreHtml}
      </dd>
    </div>
  `;
}

function getNearbyStructureTitle() {
  return latestPrecisionMode === "preview" ? "近くの構造物プレビュー" : "近くの構造物";
}

function renderCompactStructureItem(structure, distance = 0, isSelectedMarker = false) {
  const category = normalizeCategory(structure.type);
  const symbol = getCategorySymbol(category);
  const color = getCategoryColor(category);
  const confidence = structure.confidence || (structure.source === "auto" ? "中" : "-");
  const confidenceClass = getConfidenceClass(confidence);
  const distanceText = isSelectedMarker ? "クリック地点" : `約${Math.round(distance)}ブロック`;
  const sourceText = getSourceLabel(structure.source);
  const editionText = getEditionLabel(structure.edition);
  const providerText = structure.providerName || (structure.providerId ? structure.providerId : "provider未設定");
  const basisText = structure.basis || structure.reason || "生成根拠未設定";
  const structureChunkX = blockToChunk(structure.x);
  const structureChunkZ = blockToChunk(structure.z);
  const structureRegionX = blockToRegion(structure.x);
  const structureRegionZ = blockToRegion(structure.z);

  return `
    <article class="nearby-item" style="--marker-color: ${color}">
      <span class="nearby-icon" aria-hidden="true">${escapeHtml(symbol)}</span>
      <div class="nearby-item__body">
        <h3>${escapeHtml(structure.name || structure.title || category)}</h3>
        <p>${escapeHtml(distanceText)} / X=${structure.x}, Z=${structure.z}</p>
        <p>chunk X=${structureChunkX}, Z=${structureChunkZ} / region X=${structureRegionX}, Z=${structureRegionZ}</p>
        <p>${escapeHtml(sourceText)} / ${escapeHtml(editionText)}</p>
        <p>${escapeHtml(providerText)}</p>
        <p>${escapeHtml(basisText)}</p>
        <span class="confidence-pill ${confidenceClass}">候補精度: ${escapeHtml(confidence)}</span>
      </div>
    </article>
  `;
}

function getSelectedTerrainText(chunk) {
  const blockX = Number.isFinite(chunk.blockX) ? chunk.blockX : chunk.x * 16 + 8;
  const blockZ = Number.isFinite(chunk.blockZ) ? chunk.blockZ : chunk.z * 16 + 8;
  const terrain = getProviderBiomeAt(latestWorldSeed ?? 0n, latestEdition, latestVersion, blockX, blockZ, latestPrecisionMode);
  return `${getTerrainLabel(terrain)} / biomeId=${escapePlainText(terrain?.id || terrain?.biomeId || "unknown")}`;
}

function getTerrainLabel(terrain) {
  const labels = {
    plains: "草原",
    forest: "森",
    dark_forest: "暗い森",
    desert: "砂漠",
    snow: "雪原",
    ocean: "海",
    river: "川",
    mountains: "山岳",
    swamp: "湿地",
    savanna: "サバンナ",
    jungle: "ジャングル風",
    badlands: "荒野風",
  };
  return labels[terrain?.id] || terrain?.label || "簡易地形";
}

function getConfidenceClass(confidence) {
  if (confidence === "高") return "is-high";
  if (confidence === "低") return "is-low";
  return "is-medium";
}

function getSelectedMarkerDetails(markers) {
  if (!markers.length) return "";

  const markerItems = markers
    .map((marker) => `
      <article class="marker-detail">
        <h3>${escapeHtml(marker.name || marker.title)}</h3>
        <p>${escapeHtml(normalizeCategory(marker.type))} / ${escapeHtml(getSourceLabel(marker.source))} / ${escapeHtml(getEditionLabel(marker.edition))} / X=${marker.x}, Z=${marker.z}</p>
        ${marker.confidence ? `<p>候補精度: ${escapeHtml(marker.confidence)}</p>` : ""}
        ${marker.reason ? `<p>候補理由: ${escapeHtml(marker.reason)}</p>` : ""}
        ${marker.version ? `<p>対象: ${escapeHtml(marker.version)}</p>` : ""}
        <p>${escapeHtml(marker.note || marker.body || "メモ本文なし")}</p>
      </article>
    `)
    .join("");

  return `<div><dt>クリック地点のマーカー</dt><dd>${markerItems}</dd></div>`;
}

function getNearbyCandidateDetails(chunk) {
  const chunkCenterX = chunk.x * 16 + 8;
  const chunkCenterZ = chunk.z * 16 + 8;
  const nearbyStructures = getVisibleStructureRecords()
    .map((structure) => ({
      ...structure,
      distance: Math.hypot(structure.x - chunkCenterX, structure.z - chunkCenterZ),
    }))
    .filter((structure) => structure.distance <= 768)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  if (!nearbyStructures.length) {
    return '<div><dt>近くの構造物候補</dt><dd>表示中の範囲には近くの候補がありません。</dd></div>';
  }

  const items = nearbyStructures.map((structure) => `
    <article class="marker-detail">
      <h3>${escapeHtml(structure.name || structure.title)}</h3>
      <p>${escapeHtml(normalizeCategory(structure.type))} / ${escapeHtml(getSourceLabel(structure.source))} / ${escapeHtml(getEditionLabel(structure.edition))}</p>
      <p>X=${structure.x}, Z=${structure.z} / 約${Math.round(structure.distance)}ブロック</p>
      ${structure.confidence ? `<p>候補精度: ${escapeHtml(structure.confidence)}</p>` : ""}
      ${structure.reason ? `<p>候補理由: ${escapeHtml(structure.reason)}</p>` : ""}
      ${structure.version ? `<p>対象: ${escapeHtml(structure.version)}</p>` : ""}
    </article>
  `).join("");

  return `<div><dt>近くの構造物候補</dt><dd>${items}</dd></div>`;
}

function convertCoordinates() {
  const x = toInteger(getValue(elements.converterX));
  const z = toInteger(getValue(elements.converterZ));

  if (x === null || z === null) {
    setText(elements.converterResult, "変換結果: X/Zには整数を入力してください。");
    setMessage("ネザー座標変換のX/Zには整数を入力してください。", "error");
    return;
  }

  const isOverworldToNether = getValue(elements.converterDirection) === "overworld-to-nether";
  const converted = isOverworldToNether ? convertOverworldToNether(x, z) : convertNetherToOverworld(x, z);
  const label = isOverworldToNether ? "ネザー" : "オーバーワールド";

  setText(elements.converterResult, `変換結果: ${label} X=${converted.x}, Z=${converted.z}`);
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
  if (elements.copyChunk) elements.copyChunk.disabled = disabled;
  if (elements.copyCenter) elements.copyCenter.disabled = disabled;
  if (elements.copyRange) elements.copyRange.disabled = disabled;
  if (elements.usePoint) elements.usePoint.disabled = disabled;
}

function renderMemos() {
  if (!elements.memoList) return;
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
    setText(elements.centerStatus, "中心チャンク: - / 中心ブロック: -");
    return;
  }
  setText(elements.centerStatus, `中心チャンク: X=${center.centerChunkX}, Z=${center.centerChunkZ} / 中心ブロック: X=${center.centerX}, Z=${center.centerZ}`);
}

function updateMapEngine() {
  const autoStructures = getVisibleAutoStructures();
  const manualMarkers = getVisibleManualMarkers();
  const terrainProvider = getTerrainProvider(getValue(elements.terrainMode, "simple"));
  mapEngine?.setState({
    seed: latestWorldSeed ?? 0n,
    edition: latestEdition,
    version: latestVersion,
    precisionMode: latestPrecisionMode,
    centerX: toInteger(getValue(elements.centerX)) ?? 0,
    centerZ: toInteger(getValue(elements.centerZ)) ?? 0,
    structures: autoStructures,
    manualMarkers,
    layers: {
      terrain: isChecked(elements.terrainLayerToggle) && terrainProvider.isAvailable,
      slime: isChecked(elements.slimeLayerToggle),
      structures: isChecked(elements.autoStructureLayerToggle),
      manual: isChecked(elements.manualMarkerLayerToggle),
      origin: isChecked(elements.centerMarkerLayerToggle),
      chunkGrid: isChecked(elements.chunkGridToggle, false),
      regionGrid: isChecked(elements.regionGridToggle, false),
    },
  });
  updateStructureCandidateStatusV52({
    autoVisible: autoStructures.length,
    manualVisible: manualMarkers.length,
  });
}

function getMarkerDetailsFromMarkers(markers) {
  if (!markers.length) return "";

  const markerItems = markers
    .map((memo) => `
      <article class="marker-detail">
        <h3>${escapeHtml(memo.name || memo.title)}</h3>
        <p>${escapeHtml(normalizeCategory(memo.type))} / ${escapeHtml(getSourceLabel(memo.source))} / ${escapeHtml(getEditionLabel(memo.edition))} / X=${memo.x}, Z=${memo.z}</p>
        <p>${escapeHtml(memo.note || memo.body || "メモ本文なし")}</p>
      </article>
    `)
    .join("");

  return `<div><dt>クリック地点のマーカー</dt><dd>${markerItems}</dd></div>`;
}

function getNearbyStructureDetails(chunk) {
  const chunkCenterX = chunk.x * 16 + 8;
  const chunkCenterZ = chunk.z * 16 + 8;
  const nearbyStructures = getVisibleStructureRecords()
    .map((structure) => ({
      ...structure,
      distance: Math.hypot(structure.x - chunkCenterX, structure.z - chunkCenterZ),
    }))
    .filter((structure) => structure.distance <= 512)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  if (!nearbyStructures.length) {
    return '<div><dt>近くの構造物候補</dt><dd>表示中の範囲には近くの候補がありません。</dd></div>';
  }

  const items = nearbyStructures.map((structure) => `
    <article class="marker-detail">
      <h3>${escapeHtml(structure.name || structure.title)}</h3>
      <p>${escapeHtml(normalizeCategory(structure.type))} / ${escapeHtml(getSourceLabel(structure.source))} / ${escapeHtml(getEditionLabel(structure.edition))}</p>
      <p>X=${structure.x}, Z=${structure.z} / 約${Math.round(structure.distance)}ブロック</p>
    </article>
  `).join("");

  return `<div><dt>近くの構造物候補</dt><dd>${items}</dd></div>`;
}

function renderCategoryFilters() {
  if (!elements.memoFilterGroup) return;
  elements.memoFilterGroup.innerHTML = [
    '<label><input type="checkbox" value="all" checked> 全表示</label>',
    ...STRUCTURE_CATEGORIES.map((category) => `<label><input type="checkbox" value="${escapeHtml(category)}" checked> ${escapeHtml(category)}</label>`),
  ].join("");
}

function renderMemoTypeOptions() {
  if (!elements.memoType) return;
  elements.memoType.innerHTML = STRUCTURE_CATEGORIES
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  elements.memoType.value = "拠点";
  if (!elements.memoType.value) elements.memoType.value = "その他";
}

function getFilteredMemos() {
  const titleQuery = getValue(elements.memoSearch).trim().toLowerCase();
  const categoryQuery = getValue(elements.memoCategorySearch).trim().toLowerCase();
  const activeCategories = getActiveCategories();

  return loadMemos().filter((memo) => {
    const category = normalizeCategory(memo.type);
    const titleMatches = !titleQuery || String(memo.title || memo.name || "").toLowerCase().includes(titleQuery);
    const categoryMatches = !categoryQuery || category.toLowerCase().includes(categoryQuery);
    return titleMatches && categoryMatches && activeCategories.has(category);
  });
}

function getActiveCategories() {
  if (!elements.memoFilterGroup) return new Set(STRUCTURE_CATEGORIES);
  const allFilter = elements.memoFilterGroup.querySelector('input[type="checkbox"][value="all"]');
  if (allFilter?.checked) return new Set(STRUCTURE_CATEGORIES);

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

function getVisibleAutoStructures() {
  return getVisibleStructures({
    manualStructures: [],
    autoStructures: latestAutoStructures,
    activeCategories: getActiveCategories(),
    showManual: false,
    showAuto: isChecked(elements.autoStructureLayerToggle),
  });
}

function getVisibleManualMarkers() {
  return getVisibleStructures({
    manualStructures: getFilteredMemos(),
    autoStructures: [],
    activeCategories: getActiveCategories(),
    showManual: isChecked(elements.manualMarkerLayerToggle),
    showAuto: false,
  });
}

function updateStructureCandidateStatusV52(stats = { autoVisible: 0, manualVisible: 0 }) {
  if (!elements.structureCandidateStatus) return;
  const autoDetected = latestAutoStructures.length;
  const autoLayerOn = isChecked(elements.autoStructureLayerToggle);
  const visibleAuto = stats.autoVisible || 0;
  const visibleManual = stats.manualVisible || 0;
  const cacheStats = getStructureCacheStats({ mode: latestPrecisionMode, edition: latestEdition });
  const layerName = getStructureLayerName();

  if (!autoLayerOn) {
    elements.structureCandidateStatus.textContent = `${layerName}: ${autoDetected}件検出 / レイヤーOFF / キャッシュ ${cacheStats.cachedAreas}範囲`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  if (!autoDetected) {
    elements.structureCandidateStatus.textContent = `${layerName}: 表示範囲内に表示できる構造物はありません / 手動マーカー ${visibleManual}件 / キャッシュ ${cacheStats.cachedAreas}範囲`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  if (!visibleAuto) {
    elements.structureCandidateStatus.textContent = `${layerName}: ${autoDetected}件検出 / フィルタ後 0件 / 手動マーカー ${visibleManual}件 / キャッシュ ${cacheStats.cachedAreas}範囲`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  elements.structureCandidateStatus.textContent = `${layerName}: ${autoDetected}件検出 / 表示中 ${visibleAuto}件 / 手動マーカー ${visibleManual}件 / キャッシュ ${cacheStats.cachedAreas}範囲`;
  elements.structureCandidateStatus.classList.toggle("is-empty", false);
}

function updateStructureCandidateStatus(stats = { autoVisible: 0, manualVisible: 0 }) {
  if (!elements.structureCandidateStatus) return;
  const autoDetected = latestAutoStructures.length;
  const autoLayerOn = isChecked(elements.autoStructureLayerToggle);
  const visibleAuto = stats.autoVisible || 0;
  const visibleManual = stats.manualVisible || 0;

  if (!autoLayerOn) {
    elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / 自動候補レイヤーOFF`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  if (!autoDetected) {
    elements.structureCandidateStatus.textContent = `構造物候補: 表示範囲内に候補がありません / 手動マーカー ${visibleManual}件`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  if (!visibleAuto) {
    elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / フィルタ後 0件 / 手動マーカー ${visibleManual}件`;
    elements.structureCandidateStatus.classList.toggle("is-empty", true);
    return;
  }

  elements.structureCandidateStatus.textContent = `構造物候補: ${autoDetected}件検出 / 表示中 ${visibleAuto}件 / 手動マーカー ${visibleManual}件`;
  elements.structureCandidateStatus.classList.toggle("is-empty", false);
}

function updateLayerToggleLabels() {
  setLayerLabel(elements.slimeLayerToggle, `スライムチャンク: ${isChecked(elements.slimeLayerToggle) ? "ON" : "OFF"}`);
  setLayerLabel(elements.autoStructureLayerToggle, `${getStructureLayerName()}: ${isChecked(elements.autoStructureLayerToggle) ? "ON" : "OFF"}`);
  setLayerLabel(elements.manualMarkerLayerToggle, `手動マーカー: ${isChecked(elements.manualMarkerLayerToggle) ? "ON" : "OFF"}`);
  setLayerLabel(elements.centerMarkerLayerToggle, `中心地 0,0: ${isChecked(elements.centerMarkerLayerToggle) ? "ON" : "OFF"}`);
  setLayerLabel(elements.terrainLayerToggle, `バイオーム表示: ${isChecked(elements.terrainLayerToggle) ? "ON" : "OFF"}`);
  setLayerLabel(elements.chunkGridToggle, `チャンク境界: ${isChecked(elements.chunkGridToggle, false) ? "ON" : "OFF"}`);
  setLayerLabel(elements.regionGridToggle, `リージョン境界: ${isChecked(elements.regionGridToggle, false) ? "ON" : "OFF"}`);
}

function getStructureLayerName() {
  return latestPrecisionMode === "preview" ? "構造物プレビュー" : "正確構造物";
}

function setLayerLabel(input, text) {
  const label = input?.closest(".layer-toggle")?.querySelector("span");
  if (label) label.textContent = text;
}

function updateTerrainModeStatus() {
  if (!elements.terrainModeStatus) return;
  const provider = getTerrainProvider(getValue(elements.terrainMode, "simple"));
  const mode = normalizePrecisionMode(getValue(elements.precisionMode, latestPrecisionMode));
  const edition = getValue(elements.edition, latestEdition);
  const providerStatus = getProviderStatus({ mode, edition });
  elements.terrainModeStatus.textContent = provider.isAvailable
    ? `${latestPrecisionMode === "accurate" ? "正確生成" : "プレビュー生成"} / ${providerStatus.message}`
    : `${provider.unavailableMessage} / ${providerStatus.message}`;
  elements.terrainModeStatus.classList.toggle("is-warning", !provider.isAvailable || providerStatus.fallback || providerStatus.unavailable);
  if (!provider.isAvailable || providerStatus.fallback || providerStatus.unavailable) {
    setMessage(providerStatus.fallback || providerStatus.unavailable ? providerStatus.message : provider.unavailableMessage, "error");
  }
}

function renderTerrainLegend() {
  if (!elements.terrainLegend) return;
  const providerStatus = getProviderStatus({
    mode: normalizePrecisionMode(getValue(elements.precisionMode, latestPrecisionMode)),
    edition: getValue(elements.edition, latestEdition),
  });
  if (providerStatus.unavailable) {
    elements.terrainLegend.innerHTML = '<span>正確生成エンジン未導入のため、バイオーム凡例は表示していません。</span>';
    return;
  }
  const provider = getTerrainProvider(getValue(elements.terrainMode, "simple"));
  const terrainTypes = provider.getLegend();
  if (!terrainTypes.length) {
    elements.terrainLegend.innerHTML = '<span>詳細バイオームの凡例は準備中です。</span>';
    return;
  }
  elements.terrainLegend.innerHTML = terrainTypes
    .map((terrain) => `<span><i style="--terrain-color: ${terrain.color}"></i>${escapeHtml(terrain.label)}</span>`)
    .join("");
}

function renderVersionOptions(edition, selectedValue) {
  if (!elements.version) return;
  const options = VERSION_OPTIONS[edition] || VERSION_OPTIONS.java;
  const fallbackValue = options[0][0];
  const nextValue = options.some(([value]) => value === selectedValue) ? selectedValue : fallbackValue;
  elements.version.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  elements.version.value = nextValue;
}

function renderPrecisionModeOptions(edition, selectedValue = "accurate") {
  if (!elements.precisionMode) return;
  const options = getPrecisionModeOptions(edition);
  const fallbackValue = options[0][0];
  const nextValue = options.some(([value]) => value === selectedValue) ? selectedValue : fallbackValue;
  elements.precisionMode.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`)
    .join("");
  elements.precisionMode.value = nextValue;
  latestPrecisionMode = normalizePrecisionMode(nextValue);
}

function getSelectedVersionLabel() {
  if (!elements.version) return "";
  return elements.version.options[elements.version.selectedIndex]?.textContent || "";
}

function updateVersionNote() {
  if (!elements.versionNote) return;
  if (getValue(elements.edition) === "bedrock") {
    elements.versionNote.textContent = "対象: 統合版。最新 / 1.21系 / 1.20系は現時点では同一候補ロジックです。";
    return;
  }
  elements.versionNote.textContent = "対象: Java版。1.21 / 1.20 / 1.19 / 1.18は現時点では同一候補ロジックです。";
}

function setCategoryFiltersChecked(checked) {
  if (!elements.memoFilterGroup) return;
  for (const input of elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]')) {
    input.checked = checked;
  }
}

function syncAllCategoryFilter() {
  if (!elements.memoFilterGroup) return;
  const filters = Array.from(elements.memoFilterGroup.querySelectorAll('input[type="checkbox"]'));
  const all = filters.find((input) => input.value === "all");
  const categoryFilters = filters.filter((input) => input.value !== "all");
  if (!all) return;
  all.checked = categoryFilters.every((input) => input.checked);
}

function isChecked(element, fallback = true) {
  return element ? Boolean(element.checked) : fallback;
}

function getValue(element, fallback = "") {
  return element ? String(element.value ?? "") : fallback;
}

function readNearbySectionState() {
  try {
    return localStorage.getItem(NEARBY_SECTION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeNearbySectionState(value) {
  try {
    localStorage.setItem(NEARBY_SECTION_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // localStorageが使えない環境でも折りたたみ表示自体は継続します。
  }
}

function normalizeCategory(category) {
  return normalizeStructureCategory(category);
}

function setMessage(text, type = "") {
  if (!elements.message) return;
  elements.message.textContent = text;
  elements.message.className = `message ${type}`.trim();
}

function setText(element, text) {
  if (element) element.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapePlainText(value) {
  return String(value ?? "");
}
