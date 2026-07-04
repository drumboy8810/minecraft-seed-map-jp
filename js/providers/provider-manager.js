import { javaAccurateBiomeProvider } from "./java-accurate-biome-provider.js?v=7.0.0";
import { javaAccurateStructureProvider } from "./java-accurate-structure-provider.js?v=7.0.0";
import { previewBiomeProvider } from "./preview-biome-provider.js?v=7.0.0";
import { previewStructureProvider } from "./preview-structure-provider.js?v=7.0.0";

export const PRECISION_MODES = {
  PREVIEW: "preview",
  ACCURATE: "accurate",
  BEDROCK: "bedrock",
};

let accurateLoadRequested = false;

export function getPrecisionModeOptions(edition = "java") {
  if (edition === "bedrock") {
    return [
      ["bedrock", "Bedrockモード"],
      ["preview", "高速プレビュー"],
    ];
  }
  return [
    ["accurate", "正確生成モード(Java)"],
    ["preview", "高速プレビュー"],
  ];
}

export function normalizePrecisionMode(mode) {
  if (mode === PRECISION_MODES.ACCURATE || mode === "java-accurate") return PRECISION_MODES.ACCURATE;
  if (mode === PRECISION_MODES.BEDROCK) return PRECISION_MODES.BEDROCK;
  return PRECISION_MODES.PREVIEW;
}

export function getActiveProviders({ mode = "preview", edition = "java" } = {}) {
  const precisionMode = normalizePrecisionMode(mode);
  if (precisionMode === PRECISION_MODES.ACCURATE && edition === "java") {
    requestAccurateProviderLoad();
    const exactReady = javaAccurateBiomeProvider.isAvailable() && javaAccurateStructureProvider.isAvailable();
    return {
      biomeProvider: exactReady ? javaAccurateBiomeProvider : previewBiomeProvider,
      structureProvider: exactReady ? javaAccurateStructureProvider : previewStructureProvider,
      requestedMode: precisionMode,
      activeMode: exactReady ? PRECISION_MODES.ACCURATE : PRECISION_MODES.PREVIEW,
      fallback: !exactReady,
      unavailable: false,
      message: exactReady
        ? "正確生成: cubiomes WASMを利用中です。"
        : "正確生成エンジン未導入: assets/wasm/cubiomes.wasm が未配置のため、高速プレビューへ自動フォールバックしています。",
    };
  }

  if (precisionMode === PRECISION_MODES.BEDROCK) {
    return {
      biomeProvider: previewBiomeProvider,
      structureProvider: previewStructureProvider,
      requestedMode: precisionMode,
      activeMode: PRECISION_MODES.BEDROCK,
      fallback: false,
      unavailable: false,
      message: "Bedrockモード: 現在はズレ調査用の疑似生成です。provider名、生成根拠、座標を右側詳細で確認できます。",
    };
  }

  return {
    biomeProvider: previewBiomeProvider,
    structureProvider: previewStructureProvider,
    requestedMode: precisionMode,
    activeMode: PRECISION_MODES.PREVIEW,
    fallback: false,
    unavailable: false,
    message: "高速プレビュー: 疑似生成を表示中です。実ワールド/Chunkbaseとの一致確認には使えません。",
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
