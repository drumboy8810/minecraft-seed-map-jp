# Minecraft Seed Map JP v7.0

MinecraftのSeedから、Canvasマップ上に疑似バイオーム、スライムチャンク、構造物候補、手動マーカーを重ねて表示する日本語の静的Seed Mapです。

v7.0では、精密化を最優先にし、Java版の正確生成をcubiomes WASM統合前提で進める構成に整理しました。

## 重要な方針

- 現時点ではChunkbase完全一致ではありません。
- 高速プレビューは、見た目と探索補助のための疑似生成です。
- Java版の正確なバイオーム/構造物生成は、cubiomes WASM統合が本命です。
- Bedrock版の正確生成は当面未対応で、候補表示のみです。
- WASM未配置時でもアプリは壊れず、高速プレビューで動作します。

## 精度モード

### 高速プレビュー

現在利用できる通常モードです。

- 疑似バイオームをCanvasに描画
- Seed、region座標、構造物種別、疑似バイオーム条件から構造物候補を表示
- Java版/Bedrock版の両方で利用可能
- 実ワールドやChunkbaseとはズレる場合があります

### 正確生成

Java版専用の準備中モードです。

- `assets/wasm/cubiomes.wasm` が配置されていれば読み込みを試みます
- 未配置時は「正確生成エンジン未導入」と表示します
- 未配置でも高速プレビューへフォールバックして表示を継続します
- Bedrock版では選択肢として出さず、候補表示のみ扱いです

## v7.0で追加した精密化の土台

- cubiomes WASM読み込み入口を具体化
- WASM未配置時の安全なフォールバック
- biome ID/名称/色変換テーブルを分離
- provider名、精度モード、生成根拠を右側詳細に表示
- クリック地点の block/chunk/region 座標を右側詳細に表示
- Java正確生成とBedrock候補表示の扱いをUI/READMEで明確化
- cubiomes導入手順を `tools/cubiomes-wasm/README.md` に整理

## provider構成

```text
js/providers/simple-biome-provider.js
js/providers/simple-structure-provider.js
js/providers/cubiomes-biome-provider.js
js/providers/cubiomes-structure-provider.js
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
```

## 未対応/準備中

| 項目 | 状態 |
| --- | --- |
| Java正確バイオーム | cubiomes WASM待ち |
| Java正確構造物 | cubiomes WASM待ち |
| Bedrock正確生成 | 未対応 |
| Nether詳細表示 | 後続対応 |
| End詳細表示 | 後続対応 |
| 実地形/高度/洞窟 | 未対応 |
| Chunkbase完全一致検証 | 未対応 |

## 主な機能

- Canvasマップ描画
- ドラッグ移動
- マウスホイールズーム
- 疑似バイオーム/地形色表示
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
