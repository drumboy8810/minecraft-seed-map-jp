# Bedrock accurate generation plan

Bedrock Editionの正確なSeed Mapを実現するための調査・実装方針メモです。

## 現在の結論

- Java Edition向けのcubiomesは、Bedrock Editionの正確生成エンジンとしては使えません。
- Bedrock 1.21/最新版のバイオーム、地形、構造物は、Bedrock向けに別providerを実装する必要があります。
- 疑似ノイズや現在のpreview providerでは、実ワールドやChunkbaseとの照合には使えません。
- そのため、Bedrock正確生成が未実装の間は、通常表示で疑似バイオーム/疑似構造物を表示しません。

## 実装予定provider

```text
js/providers/bedrock-accurate-biome-provider.js
js/providers/bedrock-accurate-structure-provider.js
```

現時点ではどちらも未対応providerとして実装し、空の表示と未対応メッセージを返します。

## 優先対象

1. Bedrock 1.21/最新版のバイオーム判定
2. 村
3. 廃ポータル
4. 海底神殿
5. 森の洋館
6. ピリジャー前哨基地
7. 古代都市
8. トライアルチャンバー
9. 要塞相当の探索情報

## 調査ポイント

- Bedrock Editionの公開済み実装や検証済みOSSがあるか
- バージョンごとの差分をどう扱うか
- JavaScript単体で可能か、WASM/ネイティブ移植が必要か
- GitHub Pagesで静的配布できるサイズと初期化時間に収まるか
- ライセンス表記と再配布条件

## UI方針

- Bedrock正確生成未対応時は、地形・構造物を表示しない
- preview生成を選んだ場合のみ、実用ではないデモとして疑似表示する
- preview生成の結果を「候補」「正確」と呼ばない
