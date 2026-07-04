# Minecraft Seed Map JP v6.0

MinecraftのSeedから、Canvasマップ上に疑似バイオーム、スライムチャンク、構造物候補、手動マーカーを重ねて表示する日本語の静的Seed Mapです。

v6.0では、これまでの疑似生成中心の構成から、将来の正確生成エンジン統合へ進めるためのprovider構成を追加しました。

## v6.0の方針

- 現在の表示はChunkbase完全一致ではありません。
- 高速プレビューモードでは、従来どおり疑似バイオームと疑似構造物候補を表示します。
- Java版の正確なバイオーム/構造物生成には、将来的にcubiomes WASM統合が必要です。
- 正確生成モードはJava版向けの接続口を用意済みですが、現時点ではWASM未同梱のため準備中です。
- Bedrock版は正確生成が難しいため、当面は候補表示のみとして扱います。

## 精度モード

- 高速プレビュー
  - 現在利用できる通常モードです。
  - Seedと疑似バイオームから、地形色と構造物候補を決定的に表示します。

- 正確生成
  - Java版のみ将来対応予定です。
  - `assets/wasm/cubiomes.wasm` はまだ同梱していません。
  - 未配置時は「正確生成エンジン未導入」と表示し、アプリは壊れず高速プレビュー相当で表示します。

- 統合版
  - 候補表示のみです。
  - 正確生成モードは未対応です。

## provider構成

v6.0では以下のproviderを追加しました。

- `js/providers/simple-biome-provider.js`
- `js/providers/simple-structure-provider.js`
- `js/providers/cubiomes-biome-provider.js`
- `js/providers/cubiomes-structure-provider.js`
- `js/providers/provider-manager.js`

既存のCanvas描画側は、互換レイヤーとして以下からprovider-managerを呼び出します。

- `js/map/biome-provider.js`
- `js/map/structure-provider.js`

これにより、将来cubiomes WASMを導入した場合も、Canvasマップ、構造物レイヤー、右側詳細パネルを大きく作り直さずにproviderを差し替えられる構成にしています。

## 主な機能

- Canvasマップ描画
- ドラッグ移動
- マウスホイールズーム
- 疑似バイオーム/地形色表示
- Java版/Bedrock版のスライムチャンク表示
- 構造物候補アイコン表示
- 手動マーカー/地点メモ
- 右側詳細パネル
- 近くの構造物候補の折りたたみ表示
- 座標ジャンプ
- 座標コピー
- ネザー座標変換
- レイヤーON/OFF
- 構造物カテゴリフィルタ

## 構造物候補について

現在の構造物は、Minecraft本体と同じ正確な生成ロジックではありません。

高速プレビューでは、Seed、region座標、構造物種別、疑似バイオーム条件から推定した候補を表示します。実ワールドやChunkbaseの表示とはズレる場合があります。

対象の主な候補:

- 村
- 要塞
- 廃ポータル
- 海底神殿
- 森の洋館
- ピリジャー前哨基地
- 古代都市
- トライアルチャンバー

## cubiomes WASMについて

正確なJava版バイオーム/構造物生成を目指す場合、cubiomesのWASMビルドを同梱し、providerから呼び出す必要があります。

現時点では以下は未同梱です。

- cubiomes本体
- cubiomes WASM
- 正確な構造物成立判定
- 正確なバイオーム成立判定

将来配置予定:

```text
assets/wasm/cubiomes.wasm
```

ライセンス表記は `THIRD_PARTY_NOTICES.md` で管理します。

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
