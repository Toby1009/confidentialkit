# ConfidentialKit — 4-Week MVP Roadmap

Built for a Superteam Earn / Solana Foundation grant. Thesis: the ergonomic
client **tooling** layer for Token-2022 Confidential Balances is an open niche
that this builder is uniquely positioned to fill, and it neutralizes the privacy
"liveness" problem (proof program disabled on mainnet/devnet) by developing and
demoing against a local Surfpool mainnet-fork.

## Done so far (read path)
- [x] Wire `@solana/zk-sdk` WASM (`src/wasm.ts`, lazy + browser-overridable).
- [x] ElGamal + AES decryption over the audited WASM (`src/crypto/decrypt.ts`).
- [x] Key derivation from wallet signatures/seeds (`src/crypto/keys.ts`).
- [x] Token-2022 TLV + ConfidentialTransferAccount parser (`src/state/`).
- [x] High-level `decodeConfidentialAccount` + `ConfidentialKit.inspect` (RPC).
- [x] CLI `inspect` + `decrypt` (solves token-2022#145).
- [x] 44 tests across SDK + CLI against the real WASM; CI green.

## Week 1 — Reproduce the transfer flow (de-risk gate)
- [ ] Stand up a Surfpool mainnet-fork with Token-2022 cloned (`pnpm fork:up`).
- [ ] Reproduce the full confidential-transfer flow end-to-end in a script
      (deposit → apply-pending → transfer with 3 proofs → apply → withdraw).
- [ ] Wire `@solana/zk-sdk` proof-data generation (range / validity / equality).

> **Kill/Pivot gate:** if you cannot reproduce the confidential flow on the local
> fork by end of Week 1, pivot to the runner-up: Light Protocol ZK-compression
> tooling (fully live + audited) or a Token-2022-extension-aware tx debugger.

## Week 2 — Core SDK
- [ ] Implement `ConfidentialLifecycle` (configure, deposit, apply-pending,
      transfer, withdraw) with proof-splitting handled internally.
- [ ] Implement `ConfidentialKit.inspect()` against RPC.
- [ ] Publish `@confidentialkit/sdk@0.1` to npm.

## Week 3 — CLI + adoption surface
- [ ] Ship `confidentialkit decrypt` + `inspect` (solves token-2022#145).
- [ ] LiteSVM / Surfpool test fixtures so other devs can write CT tests today.
- [ ] Docs + worked confidential-stablecoin example (`examples/`).

## Week 4 — Inspector + compliance + grant
- [ ] Web inspector UI: decode ciphertexts in-browser via WASM.
- [ ] Auditor-key selective-disclosure helper.
- [ ] Demo video against the fork; devnet/mainnet flag behind a switch.
- [ ] Grant write-up.

### Deferred (out of scope for the MVP)
Novel circuits; on-chain program changes; full wallet integration; mainnet
end-to-end (gated on ZK ElGamal re-enablement — watch token-2022#657).

## Signals to watch
- **Accelerate** if ZK ElGamal re-enables on devnet/mainnet during the build
  → ship a live mainnet demo.
- **Differentiate** if a funded team ships a competing CT SDK → narrow to the
  inspector / auditor-compliance tooling they're least likely to prioritize.
- **Cut scope** if AI tooling isn't accelerating the WASM/proof work by Week 2
  → drop the web inspector, keep SDK + CLI.
