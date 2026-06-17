# ConfidentialKit

> An open-source developer toolkit that makes Solana's **Token-2022 Confidential Balances** actually usable.

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
by 89 tests across SDK + CLI + inspector, exercising the real `@solana/zk-sdk`
WASM. The full confidential flow
(deposit → apply → decrypt) has been reproduced end-to-end on a surfpool fork
with a current Token-2022, and the SDK's decryption is validated against a real
non-zero on-chain account — see [`docs/FORK-FINDINGS.md`](docs/FORK-FINDINGS.md).
On-chain transfer *construction* (proof generation) is the remaining SDK work —
see [`docs/ROADMAP.md`](docs/ROADMAP.md).

> ⚠️ **Liveness note.** Solana's native ZK ElGamal Proof program
> (`ZkE1Gama1Proof11111111111111111111111111111`) has been **disabled on mainnet
> and devnet since 2025-06-19** (the "Phantom Challenge" Fiat-Shamir transcript
> bug). Confidential transfers are therefore not executable on live clusters as of
> mid-2026. ConfidentialKit is designed to **develop and demo against a local
> Surfpool mainnet-fork** with Token-2022 cloned, and flips to devnet/mainnet
> behind a flag the moment the program re-enables (tracking
> [`solana-program/token-2022#657`](https://github.com/solana-program/token-2022/issues/657)).

## What's in the box

| Package | What it does | State |
| --- | --- | --- |
| [`@confidentialkit/sdk`](packages/sdk) | Parse Token-2022 confidential accounts, decrypt available (AES) + pending (ElGamal) balances, derive keys from wallet signatures, and fetch via RPC — all over the audited `@solana/zk-sdk` WASM. | ✅ implemented + tested |
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

# Stand up a local mainnet-fork with Token-2022 cloned and reproduce the flow:
pnpm fork:up        # see scripts/surfpool-fork.sh
pnpm tsx examples/confidential-stablecoin/demo.ts
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
