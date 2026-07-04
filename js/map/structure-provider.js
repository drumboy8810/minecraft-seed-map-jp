import {
  getStructureCacheStats as getProviderStructureCacheStats,
  getStructuresInView as getProviderStructuresInView,
} from "../providers/provider-manager.js?v=6.0.0";

export function getStructuresInView({ seed, edition, version, centerX, centerZ, radius, mode = "preview" }) {
  return getProviderStructuresInView({ seed, edition, version, centerX, centerZ, radius, mode });
}

export function getStructureCacheStats({ mode = "preview", edition = "java" } = {}) {
  return getProviderStructureCacheStats({ mode, edition });
}
