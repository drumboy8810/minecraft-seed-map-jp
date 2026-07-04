# WASM assets

v7.0時点では、cubiomes本体やWASMバイナリは同梱していません。

将来のJava版正確生成では、以下の配置を想定しています。

```text
assets/wasm/cubiomes.wasm
assets/wasm/cubiomes.js
```

`cubiomes.wasm` が未配置の場合、アプリは壊れず「正確生成エンジン未導入」と表示し、高速プレビューで動作します。

導入手順は `tools/cubiomes-wasm/README.md` を参照してください。
