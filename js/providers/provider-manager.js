import { bedrockAccurateBiomeProvider } from "./bedrock-accurate-biome-provider.js?v=7.0.0";
import { bedrockAccurateStructureProvider } from "./bedrock-accurate-structure-provider.js?v=7.0.0";
import { javaAccurateBiomeProvider } from "./java-accurate-biome-provider.js?v=7.0.0";
import { javaAccurateStructureProvider } from "./java-accurate-structure-provider.js?v=7.0.0";
import { previewBiomeProvider } from "./preview-biome-provider.js?v=7.0.0";
import { previewStructureProvider } from "./preview-structure-provider.js?v=7.0.0";

export const PRECISION_MODES = {
  PREVIEW: "preview",
  ACCURATE: "accurate",
};

let accurateLoadRequested = false;

const unavailableBiomeProvider = {
  id: "unavailable-biome",
  label: "正確生成未対応",
  isAvailable() {
    return false;
  },
  getStatus() {
    return {
      ok: false,
      message: "正確生成が未対応のため、バイオームは表示していません。",
    };
  },
  getLegend() {
    return [];
  },
  getBiomeAt() {
    return {
      id: "unavailable",
      label: "正確生成未対応",
      color: "#101510",
      provider: "unavailable",
    };
  },
  generateBiomeTiles() {
    return [];
  },
};

const unavailableStructureProvider = {
  id: "unavailable-structure",
  label: "正確生成未対応",
  isAvailable() {
    return false;
  },
  getStatus() {
    return {
      ok: false,
      message: "正確生成が未対応のため、構造物は表示していません。",
      cachedAreas: 0,
    };
  },
  getStructuresInView() {
    return [];
  },
  getCacheStats() {
    return {
      cachedAreas: 0,
    };
  },
};

export function getPrecisionModeOptions(edition = "java") {
  if (edition === "bedrock") {
    return [
      ["accurate", "正確生成: Bedrock未対応"],
      ["preview", "統合版: 候補表示のみ"],
    ];
  }
  return [
    ["accurate", "正確生成: cubiomes WASM導入"],
    ["preview", "プレビュー生成"],
  ];
}

export function normalizePrecisionMode(mode) {
  return mode === PRECISION_MODES.ACCURATE ? PRECISION_MODES.ACCURATE : PRECISION_MODES.PREVIEW;
}

export function getActiveProviders({ mode = "preview", edition = "java" } = {}) {
  const precisionMode = normalizePrecisionMode(mode);
  if (precisionMode === PRECISION_MODES.ACCURATE && edition === "java") {
    requestAccurateProviderLoad();
    const exactReady = javaAccurateBiomeProvider.isAvailable() && javaAccurateStructureProvider.isAvailable();
    return {
      biomeProvider: exactReady ? javaAccurateBiomeProvider : unavailableBiomeProvider,
      structureProvider: exactReady ? javaAccurateStructureProvider : unavailableStructureProvider,
      requestedMode: precisionMode,
      activeMode: PRECISION_MODES.ACCURATE,
      fallback: false,
      unavailable: !exactReady,
      message: exactReady
        ? "正確生成: cubiomes WASMを利用中です。"
        : "正確生成エンジン未導入: assets/wasm/cubiomes.wasm を配置してください。導入手順は tools/cubiomes-wasm/README.md を参照してください。疑似生成は表示していません。",
    };
  }

  if (edition === "bedrock") {
    if (precisionMode === PRECISION_MODES.ACCURATE) {
      return {
        biomeProvider: bedrockAccurateBiomeProvider,
        structureProvider: bedrockAccurateStructureProvider,
        requestedMode: precisionMode,
        activeMode: PRECISION_MODES.ACCURATE,
        fallback: false,
        unavailable: true,
        message: "Bedrock正確生成は未対応です。実ワールド/Chunkbase照合用の地形・構造物は表示していません。",
      };
    }

    return {
      biomeProvider: previewBiomeProvider,
      structureProvider: previewStructureProvider,
      requestedMode: precisionMode,
      activeMode: PRECISION_MODES.PREVIEW,
      fallback: false,
      unavailable: false,
      message: "統合版プレビュー生成: 疑似生成です。実ワールド/Chunkbase比較用には使えません。",
    };
  }

  return {
    biomeProvider: previewBiomeProvider,
    structureProvider: previewStructureProvider,
    requestedMode: precisionMode,
    activeMode: PRECISION_MODES.PREVIEW,
    fallback: false,
    unavailable: false,
    message: "プレビュー生成: 疑似生成を表示中です。実ワールド/Chunkbaseとの一致確認には使えません。",
  };
}

export async function loadAccurateProviders() {
  const [biome, structure] = await Promise.allSettled([
    javaAccurateBiomeProvider.load(),
    javaAccurateStructureProvider.load(),
  ]);
  return {
    biome,
    structure,
    status: getProviderStatus({ mode: PRECISION_MODES.ACCURATE, edition: "java" }),
  };
}

function requestAccurateProviderLoad() {
  if (!accurateLoadRequested && (!javaAccurateBiomeProvider.isAvailable() || !javaAccurateStructureProvider.isAvailable())) {
    accurateLoadRequested = true;
    loadAccurateProviders().catch(() => {});
  }
}

export function getBiomeAt(seed, edition, version, x, z, mode = "preview") {
  const { biomeProvider } = getActiveProviders({ mode, edition });
  return biomeProvider.getBiomeAt(seed, edition, version, x, z);
}

export function generateBiomeTiles({ seed, edition, version, bounds, tileSize, mode = "preview" }) {
  const { biomeProvider } = getActiveProviders({ mode, edition });
  return biomeProvider.generateBiomeTiles({ seed, edition, version, bounds, tileSize });
}

export function getStructuresInView({ seed, edition, version, centerX, centerZ, radius, mode = "preview" }) {
  const { structureProvider } = getActiveProviders({ mode, edition });
  return structureProvider.getStructuresInView({ seed, edition, version, centerX, centerZ, radius });
}

export function getProviderStatus({ mode = "preview", edition = "java" } = {}) {
  const active = getActiveProviders({ mode, edition });
  const biomeStatus = active.biomeProvider.getStatus();
  const structureStatus = active.structureProvider.getStatus();
  return {
    ...active,
    biomeProviderId: active.biomeProvider.id,
    biomeProviderName: active.biomeProvider.label,
    structureProviderId: active.structureProvider.id,
    structureProviderName: active.structureProvider.label,
    biomeStatus,
    structureStatus,
    message: active.message,
  };
}

export function getStructureCacheStats({ mode = "preview", edition = "java" } = {}) {
  const { structureProvider } = getActiveProviders({ mode, edition });
  return typeof structureProvider.getCacheStats === "function"
    ? structureProvider.getCacheStats()
    : { cachedAreas: 0 };
}
