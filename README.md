# Minecraft Seed Map JP v7.0

MinecraftのSeedから、Canvasマップ上にスライムチャンク、構造物、バイオーム、手動マーカーを表示することを目標にした日本語の静的Seed Mapです。

v7.0では、Java正確生成、高速プレビュー、Bedrockモードを分離し、Bedrock利用者がズレの原因を確認できるデバッグ情報を表示する構成に整理しました。

## 重要な方針

- 現時点ではChunkbase完全一致ではありません。
- Java版の正確なバイオーム/構造物生成は、cubiomes WASM統合が本命です。
- cubiomesはJava Edition向けであり、Bedrock利用者の精度問題は解決できません。
- 正確生成エンジン未導入時でもアプリは壊れず、高速プレビューへ自動フォールバックします。
- Bedrockモードは、現時点ではズレ調査用の疑似生成です。provider名、生成根拠、座標を右側詳細で確認できます。

## 精度モード

### 正確生成モード(Java)

Java Edition向けの正確生成入口です。

- `assets/wasm/cubiomes.wasm` が配置されていれば読み込みを試みます
- WASM未配置時は「正確生成エンジン未導入」と表示し、高速プレビューへ自動フォールバックします
- cubiomesはJava Edition向けで、Bedrockの正確生成には使いません
- WASM未配置でも地図は非表示にしません

### 高速プレビュー

正確生成エンジンが未導入の場合のフォールバック兼、軽量表示モードです。

- 疑似バイオームをCanvasに描画
- Seed、region座標、構造物種別、疑似バイオーム条件から構造物候補を表示
- Java版/Bedrock版の両方で利用可能
- 実ワールドやChunkbaseとはズレる場合があります
- Chunkbase比較用の正確表示ではありません

### Bedrockモード

Bedrock Edition利用者向けのズレ調査モードです。

- seed `19860630` などで、実ワールドやChunkbaseとどこがズレるかを確認するための表示です
- 現時点のバイオーム/構造物は疑似生成であり、正確生成ではありません
- 右側詳細に provider名、biome生成根拠、structure生成根拠、block/chunk/region/canvas座標を表示します
- Bedrock正確生成providerは今後別途実装が必要です

## Bedrock正確生成について

Bedrock Editionの正確なSeed Mapは、Java版cubiomesだけでは実現できません。

Bedrock 1.21/最新版では、バイオーム、地形、構造物の生成ロジックをBedrock向けに再現する必要があります。通常のノイズ描画や現在の疑似providerでは、seed `19860630` のような実ワールド照合に耐える表示にはなりません。

そのため、Bedrockモードでは現在の疑似生成を「正確表示」として扱わず、ズレ調査用として provider名・生成根拠・座標を明示します。

Bedrock向けの調査・実装方針は `tools/bedrock-accurate-generation/README.md` に整理しています。

## v7.0で追加した精密化の土台

- cubiomes WASM読み込み入口を具体化
- WASM未配置時に高速プレビューへ自動フォールバック
- biome ID/名称/色変換テーブルを分離
- provider名、精度モード、生成根拠を右側詳細に表示
- クリック地点の block/chunk/region 座標を右側詳細に表示
- Java正確生成、高速プレビュー、Bedrockモードの扱いをUI/READMEで明確化
- cubiomes導入手順を `tools/cubiomes-wasm/README.md` に整理

## provider構成

```text
js/providers/bedrock-accurate-biome-provider.js
js/providers/bedrock-accurate-structure-provider.js
js/providers/java-accurate-biome-provider.js
js/providers/java-accurate-structure-provider.js
js/providers/preview-biome-provider.js
js/providers/preview-structure-provider.js
js/providers/provider-manager.js
js/providers/biome-colors.js
```

互換レイヤー:

```text
js/map/biome-provider.js
js/map/structure-provider.js
```

WASM接続口:

```text
js/biome/cubiomes-provider.js
assets/wasm/cubiomes.wasm
vendor/cubiomes/
tools/cubiomes-wasm/README.md
tools/bedrock-accurate-generation/README.md
```

## 正確生成で優先する対象

Java版の正確生成では、以下を優先してcubiomes WASM providerへ接続します。

- バイオーム表示
- 村
- 廃ポータル
- 海底神殿
- 森の洋館
- ピリジャー前哨基地
- 古代都市
- トライアルチャンバー
- 要塞

## 未対応/準備中

| 項目 | 状態 |
| --- | --- |
| Java正確バイオーム | cubiomes WASM待ち |
| Java正確構造物 | cubiomes WASM待ち |
| Bedrock正確生成 | 未対応。Bedrockモードでズレ調査用の疑似生成を表示 |
| Nether詳細表示 | 後続対応 |
| End詳細表示 | 後続対応 |
| 実地形/高度/洞窟 | 未対応 |
| Chunkbase完全一致検証 | 未対応 |

## 主な機能

- Canvasマップ描画
- ドラッグ移動
- マウスホイールズーム
- 正確生成モード(Java)
- 高速プレビュー
- Bedrockモード
- Java版/Bedrock版のスライムチャンク表示
- 構造物候補アイコン表示
- 中心地 0,0 表示
- 手動マーカー/地点メモ
- 右側詳細パネル
- 近くの構造物候補の折りたたみ表示
- 座標ジャンプ
- 座標コピー
- ネザー座標変換
- レイヤーON/OFF
- 構造物カテゴリフィルタ

## ローカル実行

ES Modulesを使っているため、プロジェクトルートで静的サーバーを起動してください。

```powershell
python -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000/
```

## 保存と通信

- 外部通信なしで動作します。
- ユーザー入力はブラウザ内の `localStorage` にのみ保存します。
- GitHub Pagesで公開できる静的HTML/CSS/JavaScript構成です。

## ライセンス注意

cubiomesを同梱する場合は、MITライセンス表記と著作権表示を `licenses/` と `THIRD_PARTY_NOTICES.md` に追加してください。
