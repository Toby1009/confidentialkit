# ConfidentialKit Web Inspector

A lightweight, client-side web app that decodes Token-2022 confidential-balances
account state in the browser via the `@solana/zk-sdk` WASM module — paste an
account address (and optionally a key) and see human-readable available/pending
balances plus the raw ciphertexts.

**Status:** stub. Scheduled for **Week 4** (see [`../../docs/ROADMAP.md`](../../docs/ROADMAP.md)).

Planned stack: Vite + React + the `@confidentialkit/sdk` package, with the WASM
prover/decryptor loaded in-browser. No keys ever leave the client.
