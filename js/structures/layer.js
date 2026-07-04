import { blockToChunk } from "../utils.js?v=6.0.0";
import {
  STRUCTURE_SOURCES,
  getCategoryColor,
  getCategorySymbol,
  normalizeStructureCategory,
} from "./config.js?v=6.0.0";

export function getVisibleStructures({
  manualStructures,
  autoStructures = [],
  activeCategories,
  showManual = true,
  showAuto = true,
}) {
  const structures = [
    ...(showManual ? manualStructures : []),
    ...(showAuto ? autoStructures : []),
  ];

  return structures.filter((structure) => {
    const category = normalizeStructureCategory(structure.type);
    return activeCategories.has(category);
  });
}

// Legacy HTML-grid renderer kept as a compatibility shim. v5.0 uses Canvas.
export function applyStructureLayer({ grid, structures }) {
  const cells = Array.from(grid.querySelectorAll(".chunk-cell"));
  if (!cells.length) {
    return {
      totalVisible: 0,
      autoVisible: 0,
      manualVisible: 0,
    };
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

  const renderedMarkerIds = new Set();
  let autoVisible = 0;
  let manualVisible = 0;

  for (const cell of cells) {
    const key = `${cell.dataset.x},${cell.dataset.z}`;
    const markers = structuresByChunk.get(key) || [];
    cell.classList.toggle("has-marker", markers.length > 0);
    cell.classList.toggle("has-auto-marker", markers.some((marker) => marker.source === STRUCTURE_SOURCES.AUTO));
    cell.dataset.markerIds = markers.map((marker) => marker.id).join(",");
    if (markers.length) {
      const primaryMarker = markers[0];
      for (const marker of markers) {
        if (renderedMarkerIds.has(marker.id)) continue;
        renderedMarkerIds.add(marker.id);
        if (marker.source === STRUCTURE_SOURCES.AUTO) {
          autoVisible += 1;
        } else {
          manualVisible += 1;
        }
      }
      cell.style.setProperty("--marker-color", getCategoryColor(primaryMarker.type));
      cell.dataset.markerSymbol = getCategorySymbol(primaryMarker.type);
      cell.dataset.markerCount = String(markers.length);
      cell.setAttribute("aria-label", `${cell.dataset.baseLabel}、構造物 ${markers.length}件`);
      cell.title = markers
        .map((marker) => {
          const edition = marker.edition ? ` / ${getEditionLabel(marker.edition)}` : "";
          return `${marker.name} (${normalizeStructureCategory(marker.type)} / ${getSourceLabel(marker.source)}${edition}) X=${marker.x}, Z=${marker.z}`;
        })
        .join("\n");
    } else {
      cell.style.removeProperty("--marker-color");
      cell.dataset.markerSymbol = "";
      cell.dataset.markerCount = "";
      cell.setAttribute("aria-label", cell.dataset.baseLabel);
      cell.removeAttribute("title");
    }
  }

  return {
    totalVisible: renderedMarkerIds.size,
    autoVisible,
    manualVisible,
  };
}

export function getSourceLabel(source) {
  return source === STRUCTURE_SOURCES.AUTO ? "自動候補" : "手動";
}

export function getEditionLabel(edition) {
  if (edition === "bedrock") {
    return "統合版";
  }
  if (edition === "java") {
    return "Java版";
  }
  return "共通";
}
