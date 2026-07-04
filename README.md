# Minecraft Seed Map JP v7.0

MinecraftのSeedから、Canvasマップ上にスライムチャンク、構造物、バイオーム、手動マーカーを表示することを目標にした日本語の静的Seed Mapです。

v7.0では、精密化を最優先にし、Java版の正確生成をcubiomes WASM統合前提で進める構成に整理しました。

## 重要な方針

- 現時点ではChunkbase完全一致ではありません。
- プレビュー生成は、見た目と探索補助のための疑似生成です。実ワールドやChunkbaseとの比較用ではありません。
- Java版の正確なバイオーム/構造物生成は、cubiomes WASM統合が本命です。
- Bedrock版の正確生成は当面未対応です。通常表示では疑似結果を出しません。
- WASM未配置時でもアプリは壊れず、正確生成未対応として表示します。

## 精度モード

### プレビュー生成

明示的に選んだ場合だけ利用するデモ/プレビューモードです。

- 疑似バイオームをCanvasに描画
- Seed、region座標、構造物種別、疑似バイオーム条件から構造物候補を表示
- Java版/Bedrock版の両方で利用可能
- 実ワールドやChunkbaseとはズレる場合があります
- 通常利用や実ワールド照合には使わないでください

### 正確生成

通常利用で目標にするモードです。

- `assets/wasm/cubiomes.wasm` が配置されていれば読み込みを試みます
- 未配置時は「正確生成エンジン未導入」と表示し、導入手順へのパスを案内します
- 未配置時に疑似地形/疑似構造物を正確表示として出しません
- Java版はcubiomes WASM統合を本線にします
- Bedrock版は正確生成未対応として、通常表示では地形/構造物を出しません

## Bedrock正確生成について

Bedrock Editionの正確なSeed Mapは、Java版cubiomesだけでは実現できません。

Bedrock 1.21/最新版では、バイオーム、地形、構造物の生成ロジックをBedrock向けに再現する必要があります。通常のノイズ描画や現在の疑似providerでは、seed `19860630` のような実ワールド照合に耐える表示にはなりません。

そのため、Bedrock選択時の正確生成モードでは、未実装の疑似結果を表示せず「Bedrock正確生成は未対応」と表示します。Bedrockでプレビュー生成を選んだ場合のみ、実用ではなくデモとして疑似表示を行います。

Bedrock向けの調査・実装方針は `tools/bedrock-accurate-generation/README.md` に整理しています。

## v7.0で追加した精密化の土台

- cubiomes WASM読み込み入口を具体化
- WASM未配置時に疑似結果を正確表示として出さない安全な未対応表示
- biome ID/名称/色変換テーブルを分離
- provider名、精度モード、生成根拠を右側詳細に表示
- クリック地点の block/chunk/region 座標を右側詳細に表示
- Java正確生成とBedrock未対応、プレビュー生成の扱いをUI/READMEで明確化
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
| Bedrock正確生成 | 未対応。通常表示では疑似結果を出さない |
| Nether詳細表示 | 後続対応 |
| End詳細表示 | 後続対応 |
| 実地形/高度/洞窟 | 未対応 |
| Chunkbase完全一致検証 | 未対応 |

## 主な機能

- Canvasマップ描画
- ドラッグ移動
- マウスホイールズーム
- 正確生成モード
- プレビュー生成モード
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
