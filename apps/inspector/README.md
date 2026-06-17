# ConfidentialKit Web Inspector

A client-side web app that decodes **Token-2022 confidential-balance accounts** in
the browser via the `@solana/zk-sdk` WASM module. Paste account data (or fetch it
from RPC), optionally supply your AES / ElGamal keys, and see human-readable
available/pending balances plus the raw ciphertexts.

> **Keys never leave the page.** All decryption runs locally in WASM.

## Stack

Vite + React + `@confidentialkit/sdk`, with the `@solana/zk-sdk/bundler` WASM
build loaded in-browser (`vite-plugin-wasm` + `vite-plugin-top-level-await`).

## Develop

```bash
pnpm --filter @confidentialkit/inspector dev      # http://localhost:5173
pnpm --filter @confidentialkit/inspector build    # production bundle → dist/
pnpm --filter @confidentialkit/inspector test     # pure-logic + offline decode tests
```

## Two modes

- **Paste account data (base64)** — fully offline; works today against any
  account dump (e.g. from a Surfpool fork) with no RPC.
- **Fetch via RPC** — enter an address + cluster (or a custom RPC URL).

The decode/format glue is split into pure modules (`src/inspector.ts`,
`src/format.ts`) so it is unit-tested in Node; the browser-only WASM bootstrap
lives in `src/main.tsx`.
