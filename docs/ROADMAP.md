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
- [x] Web ciphertext inspector (Vite + React, in-browser WASM) — `apps/inspector`.
- [x] 60 tests across SDK + CLI + inspector against the real WASM; CI green.

## Week 1 — Reproduce the transfer flow (de-risk gate)
- [x] Stand up a Surfpool mainnet-fork with Token-2022 cloned (`pnpm fork:up`).
- [x] Run `scripts/repro-confidential-flow.sh`; **gate passed** — see
      [`docs/FORK-FINDINGS.md`](FORK-FINDINGS.md). ZK proof program works on the
      fork; `configure` succeeds; parser validated byte-for-byte against a real
      on-chain account (golden test in CI).
- [x] **Full flow reproduced.** Built a current Token-2022 (v11.0.0) with
      `cargo-build-sbf`, overrode the canonical program on the fork via
      `surfnet_setAccount`, and ran `deposit` + `apply-pending` successfully.
      Captured a real **non-zero** account; the SDK decrypts its available
      balance (600 tokens) using owner keys derived from the wallet signature —
      validated offline in CI (`decode.real-nonzero.test.ts`).
- [x] **Proof generation, installment 1.** SDK generates the self-contained
      lifecycle proofs in TypeScript (`generatePubkeyValidityProof` for account
      configuration, `generateZeroBalanceProof` for closing), plus `verifyProof`.
      Each is validated offline by the WASM's own verifier — the same logic the
      on-chain ZK ElGamal program runs (`src/proofs/`).
- [x] **Homomorphic ciphertext arithmetic** (`subtractAmount` / `addAmount`) over
      ristretto255 (`@noble/curves`), validated against `@solana/zk-sdk`'s own
      decryption (`src/crypto/ciphertext-math.ts`).
- [x] **Withdraw proofs** (`generateWithdrawProofs`): derives the new available
      ciphertext homomorphically and produces the equality + range proofs, each
      accepted by the WASM verifier (`src/proofs/`).
- [x] **Transfer proofs** (`generateTransferProofs`): amount split (16/32),
      grouped-3-handle validity (source/dest/auditor), equality, and
      batched-range-u128, matching the on-chain split-proof construction. Tests
      confirm all three verify, the source's new balance decrypts, and the
      recipient + auditor both recover the transferred amount.
- [x] **Inline ZK-program instruction encoding** (`encodeVerifyProofInstruction`,
      `@solana/kit` for submission) — byte-identical to spl-token's working
      instruction (verified on the fork).
- [~] **On-chain submission**: blocked by a `@solana/zk-sdk` (WASM) ↔ on-chain ZK
      program **version skew** — WASM-generated proofs self-verify but fail the
      on-chain verification equation (Fiat-Shamir transcript mismatch). Documented
      + reproducible via `scripts/check-onchain-proof-compat.mjs`. See
      [`docs/FORK-FINDINGS.md`](FORK-FINDINGS.md). Resolves once the WASM version
      matches the target cluster's ZK program.
- [ ] Token-2022 confidential-transfer instruction encoding + context-state
      account flow + multi-tx sequencing (gated on the version skew above for live
      submission; can proceed against a version-matched program).

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
