export const bedrockAccurateStructureProvider = {
  id: "bedrock-accurate-structure",
  label: "Bedrock正確生成未対応",
  isAvailable() {
    return false;
  },
  getStatus() {
    return {
      ok: false,
      message: "Bedrock正確構造物生成は未対応です。実ワールド照合用の構造物は表示していません。",
      cachedAreas: 0,
    };
  },
  getStructuresInView() {
    return [];
  },
  getCacheStats() {
    return {
      cachedAreas: 0,
    };
  },
};
