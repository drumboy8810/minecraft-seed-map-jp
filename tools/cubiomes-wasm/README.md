# cubiomes WASM integration guide

Minecraft Java Editionの正確なバイオーム/構造物生成へ近づけるための、cubiomes WASM導入メモです。

このリポジトリには、現時点ではcubiomes本体、WASM、JavaScript glue codeを同梱していません。

## 配置先

ビルド済みWASMは以下に配置します。

```text
assets/wasm/cubiomes.wasm
```

必要に応じてglue codeを同梱する場合は、以下のような名前に揃えます。

```text
assets/wasm/cubiomes.js
```

## 現在のJavaScript接続口

v7.0では以下のproviderがWASM統合の入口です。

```text
js/biome/cubiomes-provider.js
js/providers/cubiomes-biome-provider.js
js/providers/cubiomes-structure-provider.js
js/providers/provider-manager.js
```

`js/biome/cubiomes-provider.js` は `assets/wasm/cubiomes.wasm` を `fetch()` し、`WebAssembly.instantiateStreaming()` または `WebAssembly.instantiate()` で読み込みます。

## 期待するWASM export

現時点のproviderは、以下のいずれかの関数名を探します。

バイオーム:

```text
getBiomeAt(seed, version, x, y, z)
get_biome_at(seed, version, x, y, z)
cubiomes_get_biome_at(seed, version, x, y, z)
```

構造物:

```text
getStructuresInView(seed, version, centerX, centerZ, radius)
get_structures_in_view(seed, version, centerX, centerZ, radius)
cubiomes_get_structures_in_view(seed, version, centerX, centerZ, radius)
```

面描画:

```text
generateArea(seed, version, centerX, centerZ, radius)
generate_area(seed, version, centerX, centerZ, radius)
```

実際のcubiomesビルドでexport名やメモリ受け渡し形式が異なる場合は、`js/biome/cubiomes-provider.js` のアダプタ層で吸収します。

## ビルド方針

1. cubiomesをMITライセンス条件に従って取得します。
2. Emscriptenなどでブラウザ向けWASMを生成します。
3. JavaScriptから呼びやすい薄いC APIを用意します。
4. 生成した `cubiomes.wasm` を `assets/wasm/` に配置します。
5. `THIRD_PARTY_NOTICES.md` と `licenses/` にMITライセンス表記を追加します。

## 正確生成で優先する対象

1. Java版バイオーム表示
2. 村
3. 廃ポータル
4. 海底神殿
5. 森の洋館
6. ピリジャー前哨基地
7. 古代都市
8. トライアルチャンバー
9. 要塞

## 注意点

- Chunkbaseと完全一致する保証は、cubiomes統合後も検証が必要です。
- Minecraftバージョンごとに生成ロジック差分があります。
- Java版を優先し、Bedrock版の正確生成は当面対象外です。
- Nether/End、構造物成立判定、バイオーム成立判定は段階的に対応します。
