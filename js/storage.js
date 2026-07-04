import { createId } from "./utils.js?v=6.0.0";
import { createStructureRecord, STRUCTURE_DIMENSIONS, STRUCTURE_SOURCES } from "./structures/config.js?v=6.0.0";

const STORAGE_KEY = "minecraft-seed-map-jp:memos:v1";

export function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeMemo) : [];
  } catch {
    return [];
  }
}

export function addMemo(memo) {
  const memos = loadMemos();
  const createdAt = new Date().toISOString();
  const savedMemo = {
    ...createStructureRecord({
      id: createId(),
      name: memo.name || memo.title,
      x: memo.x,
      z: memo.z,
      type: memo.type,
      dimension: memo.dimension || STRUCTURE_DIMENSIONS.OVERWORLD,
      source: STRUCTURE_SOURCES.MANUAL,
      note: memo.note || memo.body || "",
      createdAt,
    }),
    title: memo.name || memo.title,
    body: memo.note || memo.body || "",
    createdAt,
  };
  memos.unshift(savedMemo);
  saveMemos(memos);
  return savedMemo;
}

export function deleteMemo(id) {
  const next = loadMemos().filter((memo) => memo.id !== id);
  saveMemos(next);
  return next;
}

export function clearMemos() {
  localStorage.removeItem(STORAGE_KEY);
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function normalizeMemo(memo) {
  const normalized = createStructureRecord({
    id: memo.id || createId(),
    name: memo.name || memo.title || "名称未設定",
    x: Number(memo.x),
    z: Number(memo.z),
    type: memo.type,
    dimension: memo.dimension || STRUCTURE_DIMENSIONS.OVERWORLD,
    source: memo.source || STRUCTURE_SOURCES.MANUAL,
    note: memo.note || memo.body || "",
    createdAt: memo.createdAt,
  });

  return {
    ...normalized,
    title: normalized.name,
    body: normalized.note,
    createdAt: normalized.createdAt || new Date().toISOString(),
  };
}
