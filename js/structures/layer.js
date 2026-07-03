import { blockToChunk } from "../utils.js";
import {
  STRUCTURE_SOURCES,
  getCategoryColor,
  normalizeStructureCategory,
} from "./config.js";

export function getVisibleStructures({ manualStructures, autoStructures = [], activeCategories, showLayer }) {
  if (!showLayer) {
    return [];
  }

  return [...manualStructures, ...autoStructures].filter((structure) => {
    const category = normalizeStructureCategory(structure.type);
    return activeCategories.has(category);
  });
}

export function applyStructureLayer({ grid, structures }) {
  const cells = Array.from(grid.querySelectorAll(".chunk-cell"));
  if (!cells.length) {
    return;
  }

  const structuresByChunk = new Map();
  for (const structure of structures) {
    const chunkX = blockToChunk(structure.x);
    const chunkZ = blockToChunk(structure.z);
    const key = `${chunkX},${chunkZ}`;
    const markers = structuresByChunk.get(key) || [];
    markers.push(structure);
    structuresByChunk.set(key, markers);
  }

  for (const cell of cells) {
    const key = `${cell.dataset.x},${cell.dataset.z}`;
    const markers = structuresByChunk.get(key) || [];
    cell.classList.toggle("has-marker", markers.length > 0);
    cell.classList.toggle("has-auto-marker", markers.some((marker) => marker.source === STRUCTURE_SOURCES.AUTO));
    cell.dataset.markerIds = markers.map((marker) => marker.id).join(",");
    if (markers.length) {
      cell.style.setProperty("--marker-color", getCategoryColor(markers[0].type));
      cell.setAttribute("aria-label", `${cell.dataset.baseLabel}、構造物 ${markers.length}件`);
      cell.title = markers
        .map((marker) => `${marker.name} (${normalizeStructureCategory(marker.type)} / ${getSourceLabel(marker.source)})`)
        .join("\n");
    } else {
      cell.style.removeProperty("--marker-color");
      cell.setAttribute("aria-label", cell.dataset.baseLabel);
      cell.removeAttribute("title");
    }
  }
}

export function getSourceLabel(source) {
  return source === STRUCTURE_SOURCES.AUTO ? "自動" : "手動";
}
