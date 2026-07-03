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

const BEDROCK_UNSUPPORTED_MESSAGE = "統合版のスライムチャンク判定はv1.1では未対応です。Java版を選択してください。";

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
  setMessage("探索メモを保存しました。", "success");
});

elements.clearMemos.addEventListener("click", () => {
  if (!loadMemos().length) {
    setMessage("削除できるメモはありません。", "error");
    return;
  }
  if (confirm("すべての探索メモを削除しますか？")) {
    clearMemos();
    renderMemos();
    setMessage("探索メモをすべて削除しました。", "success");
  }
});

elements.memoList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-memo]");
  if (!button) {
    return;
  }
  deleteMemo(button.dataset.deleteMemo);
  renderMemos();
  setMessage("探索メモを削除しました。", "success");
});

renderMemos();

function generateMap() {
  const seedText = elements.seed.value.trim();
  const centerX = toInteger(elements.centerX.value);
  const centerZ = toInteger(elements.centerZ.value);
  const radius = toInteger(elements.radius.value);
  const edition = elements.edition.value;

  if (edition !== "java") {
    clearSelectedChunk();
    elements.grid.innerHTML = "";
    elements.summary.textContent = BEDROCK_UNSUPPORTED_MESSAGE;
    setMessage(BEDROCK_UNSUPPORTED_MESSAGE, "error");
    return;
  }

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
      button.setAttribute("aria-label", `チャンク X ${x}, Z ${z}, ${isSlime ? "スライムチャンク" : "通常チャンク"}`);
      button.dataset.x = String(x);
      button.dataset.z = String(z);
      button.dataset.slime = String(isSlime);
      button.addEventListener("click", () => selectChunk(button));
      fragment.appendChild(button);
    }
  }

  elements.grid.appendChild(fragment);
  elements.summary.textContent = `中心チャンク X=${centerChunkX}, Z=${centerChunkZ} / ${diameter}×${diameter} / スライム ${slimeCount}件。`;
  setMessage("マップを生成しました。チャンクを選択すると詳細を確認できます。", "success");
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
  elements.details.innerHTML = `
    <div><dt>チャンク座標</dt><dd>${details.chunkText}</dd></div>
    <div><dt>ブロック範囲</dt><dd>${details.blockText}</dd></div>
    <div><dt>中心ブロック座標</dt><dd>${details.centerText}</dd></div>
    <div><dt>判定</dt><dd>${details.resultText}</dd></div>
  `;
  setCopyButtonsDisabled(false);
  elements.memoX.value = String(selectedChunk.x * 16 + 8);
  elements.memoZ.value = String(selectedChunk.z * 16 + 8);
  if (selectedChunk.isSlime) {
    elements.memoType.value = "スライムトラップ予定地";
  }
}

function clearSelectedChunk() {
  selectedChunk = null;
  latestChunkCopyText = "";
  latestCenterCopyText = "";
  latestRangeCopyText = "";
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
}

function renderMemos() {
  const memos = loadMemos();
  if (!memos.length) {
    elements.memoList.innerHTML = '<p class="empty-state">保存済みの探索メモはありません。</p>';
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
