import { detectStructures } from "../structures/detector.js?v=5.1.0";

export function getStructuresInView({ seed, edition, version, centerX, centerZ, radius }) {
  return detectStructures({
    seed,
    edition,
    version,
    centerX,
    centerZ,
    radius,
  });
}
