import { generateArea, getBiomeAt, getStatus, load } from "./cubiomes-provider.js";

self.addEventListener("message", async (event) => {
  const { id, type, payload } = event.data || {};

  try {
    if (type === "load") {
      self.postMessage({ id, ok: true, result: await load() });
      return;
    }
    if (type === "status") {
      self.postMessage({ id, ok: true, result: getStatus() });
      return;
    }
    if (type === "getBiomeAt") {
      self.postMessage({ id, ok: true, result: getBiomeAt(payload) });
      return;
    }
    if (type === "generateArea") {
      self.postMessage({ id, ok: true, result: generateArea(payload) });
      return;
    }

    throw new Error("Unsupported cubiomes worker message type.");
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
