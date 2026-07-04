const WASM_STATUS = {
  NOT_CONFIGURED: "not-configured",
  MISSING: "missing",
  LOADED: "loaded",
};

const CUBIOMES_WASM_PATH = "assets/wasm/cubiomes.wasm";

let status = WASM_STATUS.NOT_CONFIGURED;
let moduleInstance = null;
let lastMessage = getUnavailableMessage();

export async function load() {
  status = WASM_STATUS.MISSING;
  moduleInstance = null;
  lastMessage = getUnavailableMessage();
  return {
    ok: false,
    status,
    message: lastMessage,
  };
}

export function isAvailable() {
  return status === WASM_STATUS.LOADED && moduleInstance !== null;
}

export function getBiomeAt(seed, version, x, y, z) {
  if (!isAvailable()) {
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

  return moduleInstance.getBiomeAt(seed, version, x, y, z);
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

  return moduleInstance.generateArea(seed, version, centerX, centerZ, radius);
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

  if (typeof moduleInstance.getStructuresInView !== "function") {
    return {
      ok: false,
      structures: [],
      seed,
      version,
      centerX,
      centerZ,
      radius,
      message: "cubiomes構造物providerは未実装です。",
    };
  }

  return moduleInstance.getStructuresInView(seed, version, centerX, centerZ, radius);
}

export function getStatus() {
  return {
    status,
    wasmPath: CUBIOMES_WASM_PATH,
    isAvailable: isAvailable(),
    message: lastMessage,
  };
}

export function getUnavailableMessage() {
  return "cubiomes WASM未配置です。現在は高速プレビューのみ利用できます。";
}
