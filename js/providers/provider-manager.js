import { simpleBiomeProvider } from "./simple-biome-provider.js?v=7.0.0";
import { simpleStructureProvider } from "./simple-structure-provider.js?v=7.0.0";
import { cubiomesBiomeProvider } from "./cubiomes-biome-provider.js?v=7.0.0";
import { cubiomesStructureProvider } from "./cubiomes-structure-provider.js?v=7.0.0";

export const PRECISION_MODES = {
  PREVIEW: "preview",
  ACCURATE: "accurate",
};

let accurateLoadRequested = false;

export function getPrecisionModeOptions(edition = "java") {
  if (edition === "bedrock") {
    return [
      ["preview", "統合版: 候補表示のみ"],
    ];
  }
  return [
    ["preview", "高速プレビュー"],
    ["accurate", "正確生成: cubiomes WASM導入"],
  ];
}

export function normalizePrecisionMode(mode) {
  return mode === PRECISION_MODES.ACCURATE ? PRECISION_MODES.ACCURATE : PRECISION_MODES.PREVIEW;
}

export function getActiveProviders({ mode = "preview", edition = "java" } = {}) {
  const precisionMode = normalizePrecisionMode(mode);
  if (precisionMode === PRECISION_MODES.ACCURATE && edition === "java") {
    requestAccurateProviderLoad();
    const exactReady = cubiomesBiomeProvider.isAvailable() && cubiomesStructureProvider.isAvailable();
    return {
      biomeProvider: exactReady ? cubiomesBiomeProvider : simpleBiomeProvider,
      structureProvider: exactReady ? cubiomesStructureProvider : simpleStructureProvider,
      requestedMode: precisionMode,
      activeMode: exactReady ? PRECISION_MODES.ACCURATE : PRECISION_MODES.PREVIEW,
      fallback: !exactReady,
      message: exactReady
        ? "正確生成: cubiomes WASMを利用中です。"
        : "正確生成エンジン未導入: assets/wasm/cubiomes.wasm を配置してください。導入手順は tools/cubiomes-wasm/README.md を参照してください。現在は高速プレビューで表示します。",
    };
  }

  if (edition === "bedrock") {
    return {
      biomeProvider: simpleBiomeProvider,
      structureProvider: simpleStructureProvider,
      requestedMode: precisionMode,
      activeMode: PRECISION_MODES.PREVIEW,
      fallback: precisionMode === PRECISION_MODES.ACCURATE,
      message: "統合版は候補表示のみです。Bedrock正確生成は未対応のため、Chunkbase比較用には使えません。",
    };
  }

  return {
    biomeProvider: simpleBiomeProvider,
    structureProvider: simpleStructureProvider,
    requestedMode: precisionMode,
    activeMode: PRECISION_MODES.PREVIEW,
    fallback: false,
    message: "高速プレビュー: 疑似生成を表示中です。実ワールド/Chunkbaseとの一致確認には使えません。",
  };
}

export async function loadAccurateProviders() {
  const [biome, structure] = await Promise.allSettled([
    cubiomesBiomeProvider.load(),
    cubiomesStructureProvider.load(),
  ]);
  return {
    biome,
    structure,
    status: getProviderStatus({ mode: PRECISION_MODES.ACCURATE, edition: "java" }),
  };
}

function requestAccurateProviderLoad() {
  if (!accurateLoadRequested && (!cubiomesBiomeProvider.isAvailable() || !cubiomesStructureProvider.isAvailable())) {
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
