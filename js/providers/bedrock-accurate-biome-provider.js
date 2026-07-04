export const bedrockAccurateBiomeProvider = {
  id: "bedrock-accurate-biome",
  label: "Bedrock正確生成未対応",
  isAvailable() {
    return false;
  },
  getStatus() {
    return {
      ok: false,
      message: "Bedrock正確バイオーム生成は未対応です。実ワールド照合用のバイオームは表示していません。",
    };
  },
  getLegend() {
    return [];
  },
  getBiomeAt() {
    return {
      id: "bedrock_accurate_unavailable",
      label: "Bedrock正確生成未対応",
      color: "#101510",
      provider: "bedrock-accurate-biome",
    };
  },
  generateBiomeTiles() {
    return [];
  },
};
