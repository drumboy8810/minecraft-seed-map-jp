const WASM_STATUS = {
  NOT_LOADED: "not-loaded",
  MISSING: "missing",
  LOADED: "loaded",
  UNSUPPORTED: "unsupported",
  ERROR: "error",
};

const CUBIOMES_WASM_PATH = "assets/wasm/cubiomes.wasm";

let status = WASM_STATUS.NOT_LOADED;
let moduleInstance = null;
let wasmExports = null;
let lastMessage = getUnavailableMessage();
let loadPromise = null;

export async function load() {
  if (loadPromise) return loadPromise;
  loadPromise = loadWasm();
  return loadPromise;
}

async function loadWasm() {
  moduleInstance = null;
  wasmExports = null;

  if (typeof fetch !== "function" || typeof WebAssembly === "undefined") {
    status = WASM_STATUS.UNSUPPORTED;
    lastMessage = "このブラウザではWebAssembly読み込みを利用できません。";
    return getStatusResult(false);
  }

  try {
    const response = await fetch(CUBIOMES_WASM_PATH, { cache: "no-store" });
    if (!response.ok) {
      status = WASM_STATUS.MISSING;
      lastMessage = getUnavailableMessage();
      return getStatusResult(false);
    }

    const imports = createWasmImports();
    const result = typeof WebAssembly.instantiateStreaming === "function"
      ? await WebAssembly.instantiateStreaming(response, imports)
      : await WebAssembly.instantiate(await response.arrayBuffer(), imports);

    moduleInstance = result.instance;
    wasmExports = moduleInstance.exports || {};
    status = WASM_STATUS.LOADED;
    lastMessage = "cubiomes WASMを読み込みました。エクスポート関数の対応状況を確認してください。";
    return getStatusResult(true);
  } catch (error) {
    status = WASM_STATUS.ERROR;
    lastMessage = `cubiomes WASMの読み込みに失敗しました: ${error?.message || "unknown error"}`;
    moduleInstance = null;
    wasmExports = null;
    return getStatusResult(false);
  }
}

function createWasmImports() {
  return {
    env: {
      abort() {
        throw new Error("cubiomes WASM aborted.");
      },
    },
  };
}

export function isAvailable() {
  return status === WASM_STATUS.LOADED && wasmExports !== null;
}

export function hasExport(names) {
  if (!isAvailable()) return false;
  return names.some((name) => typeof wasmExports[name] === "function");
}

export function getBiomeAt(seed, version, x, y, z) {
  if (!isAvailable()) {
    return unavailableBiomeResult(seed, version, x, y, z);
  }

  const fn = wasmExports.getBiomeAt || wasmExports.get_biome_at || wasmExports.cubiomes_get_biome_at;
  if (typeof fn !== "function") {
    return {
      ...unavailableBiomeResult(seed, version, x, y, z),
      message: "cubiomes WASMにgetBiomeAt相当の関数が見つかりません。",
    };
  }

  const biomeId = fn(toSeedNumber(seed), normalizeVersionNumber(version), Math.trunc(x), Math.trunc(y), Math.trunc(z));
  return {
    ok: true,
    biome: biomeId,
    biomeId,
    seed,
    version,
    x,
    y,
    z,
    provider: "cubiomes",
  };
}

export function generateArea(seed, version, centerX, centerZ, radius) {
  if (!isAvailable()) {
    return {
      ok: false,
      biomes: [],
      seed,
      version,
      centerX,
      centerZ,
      radius,
      message: getUnavailableMessage(),
    };
  }

  const fn = wasmExports.generateArea || wasmExports.generate_area;
  if (typeof fn !== "function") {
    return {
      ok: false,
      biomes: [],
      seed,
      version,
      centerX,
      centerZ,
      radius,
      message: "cubiomes WASMにgenerateArea相当の関数が見つかりません。",
    };
  }

  return fn(toSeedNumber(seed), normalizeVersionNumber(version), Math.trunc(centerX), Math.trunc(centerZ), Math.trunc(radius));
}

export function getStructuresInView(seed, version, centerX, centerZ, radius) {
  if (!isAvailable()) {
    return {
      ok: false,
      structures: [],
      seed,
      version,
      centerX,
      centerZ,
      radius,
      message: getUnavailableMessage(),
    };
  }

  const fn = wasmExports.getStructuresInView || wasmExports.get_structures_in_view || wasmExports.cubiomes_get_structures_in_view;
  if (typeof fn !== "function") {
    return {
      ok: false,
      structures: [],
      seed,
      version,
      centerX,
      centerZ,
      radius,
      message: "cubiomes WASMにgetStructuresInView相当の関数が見つかりません。",
    };
  }

  return fn(toSeedNumber(seed), normalizeVersionNumber(version), Math.trunc(centerX), Math.trunc(centerZ), Math.trunc(radius));
}

export function getStatus() {
  return {
    status,
    wasmPath: CUBIOMES_WASM_PATH,
    isAvailable: isAvailable(),
    exports: wasmExports ? Object.keys(wasmExports) : [],
    message: lastMessage,
  };
}

export function getUnavailableMessage() {
  return "cubiomes WASM未配置です。assets/wasm/cubiomes.wasm を配置してください。導入手順は tools/cubiomes-wasm/README.md を参照してください。";
}

function getStatusResult(ok) {
  return {
    ok,
    status,
    wasmPath: CUBIOMES_WASM_PATH,
    isAvailable: isAvailable(),
    message: lastMessage,
  };
}

function unavailableBiomeResult(seed, version, x, y, z) {
  return {
    ok: false,
    biome: null,
    seed,
    version,
    x,
    y,
    z,
    message: getUnavailableMessage(),
  };
}

function toSeedNumber(seed) {
  const value = typeof seed === "bigint" ? seed : BigInt(seed);
  return Number(BigInt.asIntN(53, value));
}

function normalizeVersionNumber(version) {
  const match = String(version).match(/1\.(\d+)/);
  return match ? Number(match[1]) : 21;
}
