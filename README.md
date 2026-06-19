# ConfidentialKit

[![npm: @confidentialkit/sdk](https://img.shields.io/npm/v/@confidentialkit/sdk?label=%40confidentialkit%2Fsdk)](https://www.npmjs.com/package/@confidentialkit/sdk)
[![npm: @confidentialkit/cli](https://img.shields.io/npm/v/@confidentialkit/cli?label=%40confidentialkit%2Fcli)](https://www.npmjs.com/package/@confidentialkit/cli)
[![npm: @confidentialkit/kit](https://img.shields.io/npm/v/@confidentialkit/kit?label=%40confidentialkit%2Fkit)](https://www.npmjs.com/package/@confidentialkit/kit)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE-MIT)

> An open-source developer toolkit that makes Solana's **Token-2022 Confidential Balances** actually usable.

## Install

```bash
npm install @confidentialkit/sdk          # core SDK (parse / decrypt / prove)
npm install -g @confidentialkit/cli       # inspect + decrypt from the terminal
npm install @confidentialkit/kit          # @solana/kit submission adapter
```

ConfidentialKit closes the documented developer-experience gap around confidential
transfers — no `spl-token --decrypt`, a historically Rust-only flow, and a
multi-transaction "proof hell" that Arcium and others cite as a key blocker to
confidential-DeFi adoption. It is built on the new
[`@solana/zk-sdk`](https://www.npmjs.com/package/@solana/zk-sdk) (WASM proof
generation), is **compliance-first** (auditor keys / selective disclosure), and is
**mainnet-ready** for the moment the on-chain ZK ElGamal program re-enables.

## Status

🟢 **`0.0.x` — read path implemented and tested.** Account parsing, balance
decryption, key derivation, full lifecycle **proof generation** (configure,
close, withdraw, and transfer — equality / grouped-validity / range proofs over
homomorphic ciphertext arithmetic, each checkable with `verifyProof`), instruction
encoding (ZK-program verify/context-state/close + the Token-2022 confidential
`Withdraw`, validated byte-for-byte against a real on-chain instruction), the CLI
(`inspect`/`decrypt`), an RPC client and a web inspector are working and covered
by 101 tests across SDK + CLI + inspector + kit, exercising the real `@solana/zk-sdk`
WASM. The full confidential flow — configure → deposit → apply → **confidential
transfer** → decrypt — has been reproduced **end-to-end on public devnet**
(agave 4.1.0-rc.1) with the version-matched `spl-token-cli` 5.6.1, and the SDK
decrypts the resulting live, non-zero on-chain accounts — including the **hidden
amounts of real confidential transfers** — straight from RPC. See
[`docs/FORK-FINDINGS.md`](docs/FORK-FINDINGS.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md).

> ⚠️ **Liveness note (updated 2026-06).** Solana's native ZK ElGamal Proof program
> (`ZkE1Gama1Proof11111111111111111111111111111`) is **live and verifying on
> devnet** — we ran the full confidential flow (configure → deposit → transfer →
> apply) there. The real gate is a **client ↔ cluster version match**: the ZK
> *proof transcript* and the *key-derivation KDF* (SHA3-512 → HKDF-SHA512,
> [zk-elgamal-proof#35](https://github.com/solana-program/zk-elgamal-proof/issues/35))
> are version-pinned, so tooling must match the cluster's agave — `spl-token-cli`
> 5.6.1 ↔ devnet 4.1.x works; 5.5.0 is rejected (`AlgebraicRelation`). `@solana/zk-sdk`
> 0.4.2 (our browser WASM) is currently behind that line, so the SDK **parses and
> decrypts live accounts** but cannot yet **generate accepted proofs** in-browser.
> Mainnet's deployed Token-2022 still has confidential transfers gated (tracking
> [`token-2022#657`](https://github.com/solana-program/token-2022/issues/657)). The
> full version matrix is in [`docs/FORK-FINDINGS.md`](docs/FORK-FINDINGS.md).

## Live demo & on-chain proof

- **Interactive demo** ([`apps/site`](apps/site)) — the SDK running live in your
  browser: **reveal a real confidential transfer** from devnet and decrypt the
  hidden amount, encrypt/decrypt your own number, and build a full transfer plan.
  Lightweight Vite app, one-click Vercel deploy (`vercel.json` included).
  <!-- live demo URL: add your Vercel link here -->
- **Verify it yourself on devnet** — everything below is real, version-matched
  on-chain state, decryptable with this SDK:
  - Live confidential account (600 tokens): [`736aw6bF…vW3Jo`](https://explorer.solana.com/address/736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo?cluster=devnet)
  - Confidential-transfer mint: [`HfgBdtQ9…WB4q`](https://explorer.solana.com/address/HfgBdtQ9u3FGDEFaxf9KS2hcCwR5pLBfh6y1dwTSWB4q?cluster=devnet)
  - A real confidential transfer — amount hidden on-chain, decrypted by the SDK: [recipient `GDFyNfj6…`](https://explorer.solana.com/address/GDFyNfj6ZbBrXWzsZuFvBmab6V8Y3geYZrkdhnzJ9z9M?cluster=devnet) · [transfer tx](https://explorer.solana.com/tx/41zf4Sk1mANE92UoiHL4jkiBfeNgDDsLzq3fVPQPrGubfNPb7i5db1bCdSe6i2iSB6y48FQMrGbJoJLfXWMsgfjr?cluster=devnet)
  - Reproduce: [`scripts/devnet-confidential-live.sh`](scripts/devnet-confidential-live.sh) · [`scripts/devnet-confidential-transfers.sh`](scripts/devnet-confidential-transfers.sh)

## What's in the box

| Package | What it does | State |
| --- | --- | --- |
| [`@confidentialkit/sdk`](packages/sdk) | Parse Token-2022 confidential accounts, decrypt available (AES) + pending (ElGamal) balances, derive keys from wallet signatures, generate the ZK proofs, and encode instructions — all over the audited `@solana/zk-sdk` WASM. **Network-free** (offline-first). | ✅ implemented + tested |
| [`@confidentialkit/cli`](packages/cli) | `confidentialkit inspect` + `decrypt` — solves [token-2022#145](https://github.com/solana-program/token-2022/issues/145): turns raw ElGamal/AES ciphertexts into human-readable balances. | ✅ implemented + tested |
| [`apps/inspector`](apps/inspector) | Web "ciphertext inspector" — decode confidential account state in-browser via WASM (paste base64 or fetch via RPC). | ✅ implemented + tested |
| confidential transfer lifecycle (configure → deposit → apply → transfer → withdraw) | Proof generation + transaction construction. | ⏳ gated on ZK ElGamal re-enablement |

## Why this exists

Confidential transfers hide **amounts, not identities** ("confidentiality, not
anonymity"). Every confidential-token issuer (PYUSD, USDG, AUSD have already
*initialized* the extension) and every privacy-aware app on Solana will need an
ergonomic client SDK the moment the verifier flips back on. There is no dominant
incumbent SDK in this niche today — ConfidentialKit aims to be the public good that
fills it.

## Quickstart (developer preview)

```bash
pnpm install
pnpm build

# Run the end-to-end pipeline demo (self-contained, no validator needed):
#   keys → proof generation → verification → recipient/auditor decryption →
#   transaction-plan construction
pnpm --filter @confidentialkit/example-confidential-stablecoin demo

# Or reproduce the full on-chain flow against a local mainnet-fork:
pnpm fork:up        # see scripts/repro-confidential-flow.sh
```

## Repo layout

```
packages/sdk        TypeScript SDK (the "live product")
packages/cli        CLI: decrypt + inspector
apps/inspector      Web ciphertext inspector (WASM)
examples/           Worked confidential-stablecoin example
scripts/            Surfpool mainnet-fork harness
docs/               Roadmap, architecture, grant notes
```

## License

MIT. See [`LICENSE-MIT`](LICENSE-MIT).

## Acknowledgements & references

- ZK ElGamal disable post-mortem & the "Phantom Challenge" bug (zkSecurity).
- `@solana/zk-sdk` (WASM proof library, 2026).
- Solana Foundation **Privacy Hack** (Jan 2026) "Privacy Tooling" track.
