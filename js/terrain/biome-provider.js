import { cubiomesProvider } from "./cubiomes-provider.js";
import { simpleTerrainProvider } from "./simple-terrain-provider.js";

const providers = {
  [simpleTerrainProvider.id]: simpleTerrainProvider,
  [cubiomesProvider.id]: cubiomesProvider,
};

export function getTerrainProvider(providerId) {
  return providers[providerId] || simpleTerrainProvider;
}

export function getTerrainProviderOptions() {
  return Object.values(providers).map((provider) => ({
    id: provider.id,
    label: provider.label,
    isAvailable: provider.isAvailable,
  }));
}
