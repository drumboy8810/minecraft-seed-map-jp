import { createId } from "./utils.js";

const STORAGE_KEY = "minecraft-seed-map-jp:memos:v1";

export function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addMemo(memo) {
  const memos = loadMemos();
  const savedMemo = {
    id: createId(),
    title: memo.title,
    x: memo.x,
    z: memo.z,
    type: memo.type,
    body: memo.body,
    createdAt: new Date().toISOString(),
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
