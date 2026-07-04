# cubiomes vendor placeholder

This directory is reserved for future cubiomes integration notes or source/build metadata.

The project does not bundle cubiomes source code, JavaScript glue code, or WebAssembly binaries yet.

Expected runtime artifact:

```text
assets/wasm/cubiomes.wasm
```

Implementation entrypoint:

```text
js/biome/cubiomes-provider.js
```

Build and integration notes:

```text
tools/cubiomes-wasm/README.md
```

When cubiomes is bundled, include the MIT license notice in `licenses/` and update `THIRD_PARTY_NOTICES.md`.
