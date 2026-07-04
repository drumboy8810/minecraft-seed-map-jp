import {
  generateBiomeTiles as generateProviderBiomeTiles,
  getBiomeAt as getProviderBiomeAt,
} from "../providers/provider-manager.js?v=7.0.0";

export function getBiomeAt(seed, edition, version, x, z, mode = "preview") {
  return getProviderBiomeAt(seed, edition, version, x, z, mode);
}

export function generateBiomeTiles({ seed, edition, version, bounds, tileSize, mode = "preview" }) {
  return generateProviderBiomeTiles({ seed, edition, version, bounds, tileSize, mode });
}
