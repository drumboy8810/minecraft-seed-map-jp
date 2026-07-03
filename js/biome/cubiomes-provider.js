const WASM_STATUS = {
  NOT_CONFIGURED: "not-configured",
  MISSING: "missing",
  LOADED: "loaded",
};

const CUBIOMES_WASM_PATH = "assets/wasm/cubiomes.wasm";

let status = WASM_STATUS.NOT_CONFIGURED;
let moduleInstance = null;

export async function load() {
  status = WASM_STATUS.MISSING;
  moduleInstance = null;
  return {
    ok: false,
    status,
    message: getUnavailableMessage(),
  };
}

export function isAvailable() {
  return status === WASM_STATUS.LOADED && moduleInstance !== null;
}

export function getBiomeAt() {
  throw new Error(getUnavailableMessage());
}

export function generateArea() {
  throw new Error(getUnavailableMessage());
}

export function getStatus() {
  return {
    status,
    wasmPath: CUBIOMES_WASM_PATH,
    isAvailable: isAvailable(),
    message: getUnavailableMessage(),
  };
}

export function getUnavailableMessage() {
  return "cubiomes WASM未配置です。現在は簡易地形のみ利用できます。";
}
