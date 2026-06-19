# Week-1 Fork Findings (empirical)

Run against: **Agave 4.0.1**, **spl-token-cli 5.5.0**, **surfpool 1.0.0**, on a
surfpool mainnet-fork (`surfpool start --network mainnet`). Reproduce with
[`scripts/repro-confidential-flow.sh`](../scripts/repro-confidential-flow.sh).

## TL;DR — the gate is nuanced, and it sharpens the thesis

| Capability | Result on surfpool mainnet-fork |
| --- | --- |
| ZK ElGamal proof program present + executable | ✅ yes (`Executable: true`, owner `NativeLoader`) |
| `configure-confidential-transfer-account` (submits a pubkey-validity proof) | ✅ **succeeds** |
| `deposit` / `apply` on the **mainnet-cloned** program | ❌ `InvalidInstructionData` (program build, not a feature gate — also fails with `--feature enable-all-features`) |
| `deposit` / `apply` after deploying a **current** Token-2022 | ✅ **succeeds** (see below) |
| **SDK parser vs. real on-chain account layout** | ✅ **byte-accurate** |
| **SDK decrypts a real non-zero balance** | ✅ `600` tokens recovered |

## What this means

1. **The ZK proof program works on a fork.** Configuration submits a real
   pubkey-validity proof and is accepted — so the proof machinery is usable for
   development, exactly as the thesis predicted.
2. **The Token-2022 program cloned from mainnet rejects deposits/applies.** The
   mainnet build is the post-2025-06-11 multisig deployment with confidential
   transfers disabled, so `Deposit`/`ApplyPendingBalance` fail with
   `InvalidInstructionData`. The full transfer flow is **not** reproducible by
   cloning mainnet — it needs a *current* Token-2022 program (deploy a recent
   `spl_token_2022.so` onto the fork, or use a `solana-test-validator` that
   bundles one). This is the liveness wall, observed directly.
3. **Our parser is validated against real program output.** A real configured
   account was dumped and parsed; every field (mint, flags, counters, ElGamal
   pubkey, all four ciphertexts) matches `spl-token account-info` byte-for-byte.
   This is locked into CI as a golden fixture:
   `packages/sdk/src/state/real-account.test.ts`.

## Gate decision

**Do not pivot.** The read/inspect path — the shipped product — is validated
against the real program. The remaining transfer-construction work is unblocked
by targeting a current Token-2022 build on the fork (next step), independent of
mainnet re-enablement.

## Next step (for the full flow)

Deploy a current `spl_token_2022.so` to the fork (overriding the cloned mainnet
one), then re-run the deposit → apply → transfer → withdraw flow and capture a
**non-zero** confidential account to validate the decryption path end-to-end.

## ✅ Full flow reproduced with a current Token-2022

The deposit wall was purely the cloned mainnet program build. Resolved by
deploying a **current** Token-2022 onto the fork:

1. Built `spl_token_2022.so` from `solana-program/token-2022` (v11.0.0) with
   `cargo-build-sbf` (~15s; platform-tools v1.53).
2. Overwrote the canonical program account (it is under the non-upgradeable
   `BPFLoader2`, which stores the ELF directly) using surfpool's cheat RPC:
   `surfnet_setAccount("TokenzQ…", { data: <hex ELF>, owner: BPFLoader2…, executable: true })`.
3. Re-ran the flow on the **canonical** `--program-2022`:

| Step | Result on the upgraded fork |
| --- | --- |
| `deposit-confidential-tokens 600` | ✅ succeeds |
| `apply-pending-balance` | ✅ succeeds |
| SDK decrypts the real available balance | ✅ `600_000_000_000` base units (600 @ 9 decimals) |

The decryption path is now validated end-to-end against real program output:
the owner key was derived from the payer's ed25519 signature exactly as
spl-token-cli does (sign `b"ElGamalSecretKey"` / `b"AeKey"` with an **empty**
public_seed, then `fromSignature` — an owner-wide key, not per-account), and our
`decryptAeCiphertext` recovered the deposited amount. Locked into CI as an
offline golden fixture: `packages/sdk/src/__fixtures__/real-nonzero-account.ts`
+ `packages/sdk/src/decode.real-nonzero.test.ts`.

> Reproduce with `scripts/repro-confidential-flow.sh` (it builds + overrides the
> program, then runs the full flow). This proves the thesis directly: **build and
> demo against a fork today, mainnet-ready the moment the program re-enables.**

## WASM ↔ on-chain proof version skew (2026 — proof generation)

The SDK now generates the ZK proofs itself (`generatePubkeyValidityProof`, etc.)
and encodes the inline ZK ElGamal `Verify` instruction
(`encodeVerifyProofInstruction`). Submitting one to the fork revealed a concrete
interop gap, reproducible with `scripts/check-onchain-proof-compat.mjs`:

| Check | Result |
| --- | --- |
| SDK proof passes the WASM verifier (`verifyProof`) | ✅ |
| Our inline instruction matches spl-token's byte-for-byte (program ZK, 0 accounts, 97 B, disc 4) | ✅ |
| spl-token's **Rust**-generated proof, submitted via our `@solana/kit` path | ✅ accepted |
| Our **WASM** (`@solana/zk-sdk` 0.4.2) proof, same path | ❌ `SigmaProof(PubkeyValidity, AlgebraicRelation)` |

**Diagnosis.** The proof is internally valid — it just fails the on-chain
verification *equation* because `@solana/zk-sdk` 0.4.2 and the ZK ElGamal program
that surfpool bundles (agave `3.1.6`) compute the Fiat-Shamir challenge from
slightly different transcripts. Same family as the "Phantom Challenge" issue:
small transcript differences silently change the challenge, so a proof valid
under one version is rejected by another. spl-token-cli 5.5.0 (native Rust,
version-matched to the program) is accepted; the WASM build is the outlier here.

**Takeaways.**
- ConfidentialKit's proof generation is *cryptographically* correct (it
  self-verifies with the audited WASM verifier) and the instruction encoding is
  correct (byte-identical to the working spl-token instruction).
- **On-chain acceptance additionally requires the `@solana/zk-sdk` WASM version
  to match the target cluster's ZK ElGamal program version.** This is exactly the
  kind of DevEx footgun ConfidentialKit should surface — the compat probe lets a
  developer check it for a given cluster in one command.
- Mitigations to track: pin/track the `@solana/zk-sdk` ↔ agave version matrix,
  and (once the program re-enables on a known version) validate end-to-end against
  it. Until then, proof generation is validated offline against the WASM verifier.

## Live on **public devnet** (2026-06-17) — the version matrix, confirmed end-to-end

Everything above was on a surfpool fork. We then reproduced the gate **and broke
through it** on the real **devnet** (`getVersion` → agave **4.1.0-rc.1**), with a
throwaway funded keypair — no fork, no cheat RPC.

| Step | `spl-token-cli` **5.5.0** (zk-sdk ~0.x, our local) | `spl-token-cli` **5.6.1** (zk-sdk 7.0.x) |
| --- | --- | --- |
| create confidential mint | ✅ | ✅ |
| `configure-confidential-transfer-account` | ❌ `SigmaProof(PubkeyValidity, AlgebraicRelation)` | ✅ **accepted** |
| `deposit-confidential-tokens 600` | ❌ blocked (configure never landed) | ✅ |
| `apply-pending-balance` | — | ✅ |

**This nails the thesis to the wall:** devnet's ZK ElGamal program is *live and
verifying* — it rejected the **official** Solana CLI 5.5.0's proof (not our code,
not our WASM) and accepted 5.6.1's. The liveness gate is purely a **client↔cluster
proof-version match**: `spl-token-cli 5.6.1` (built on `solana-zk-sdk 7.0.x`) is
version-aligned to devnet's agave 4.1-rc; 5.5.0 is not. Same failure family we saw
for our WASM on the fork, now confirmed on a public cluster with canonical tooling.

### The resulting live account (publicly verifiable)

| | |
| --- | --- |
| Mint (`confidentialTransferMint`) | `HfgBdtQ9u3FGDEFaxf9KS2hcCwR5pLBfh6y1dwTSWB4q` |
| Account (`confidentialTransferAccount`, non-zero) | `736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo` |
| configure / deposit / apply tx | `23Nz3ZRv…1xXj` / `55rQnzYg…7yRK` / `44kPTD9b…6T53B` |

Explorer: `https://explorer.solana.com/address/736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo?cluster=devnet`

### SDK validated against the live account

Fetched the account straight from devnet RPC and ran `decodeConfidentialAccount`:
the parse is **byte-correct** against the live on-chain layout — `mint`,
`approved: true`, and the ElGamal pubkey (`ecf07215…98f92e`) all match
`spl-token account-info`. Parsing and the decryption math are **version-stable**.

**One more skew, now in key derivation — root-caused.** The on-chain ElGamal
pubkey matched *neither* our WASM (`@solana/zk-sdk` 0.4.2) owner-wide nor
per-account `signerMessage` derivation. Reading the 7.0.1 source explains why: the
confidential-key KDF **migrated from a non-standard SHA3-512 scheme (now
`*_legacy`) to HKDF-SHA512** (zk-elgamal-proof #35). 0.4.2 still does the legacy
KDF; 5.6.1 does the new one — so `signer → key` is version-skewed independently of
the proof transcript.

**Resolved.** Re-deriving with the new KDF (`derive_confidential_keys`, **empty**
public seed = owner-wide) reproduced the on-chain ElGamal pubkey **exactly**
(`ecf07215…98f92e`). Handing the resulting 16-byte AES key to the SDK as raw bytes
(`decryptAeCiphertext` is derivation-agnostic), `decodeConfidentialAccount` then
decrypted the **live devnet balance end-to-end: `600000000000` base units = 600
tokens**, and a wrong key was rejected. So the SDK's parse **and** decrypt are
validated against a real, public, non-zero on-chain account — the only missing
piece for current devnet is an `@solana/zk-sdk` build that tracks the 7.0.x
KDF/transcript. Reproduce with [`scripts/devnet-confidential-live.sh`](../scripts/devnet-confidential-live.sh).

### The version matrix, distilled

| Layer | What skews | Stable across versions? |
| --- | --- | --- |
| Account **parsing** (TLV offsets/lengths) | nothing observed | ✅ yes |
| **Decrypt math** (AES-GCM-SIV, ElGamal) | nothing observed | ✅ yes |
| **Key derivation** (`signer → key`) | SHA3-512 → HKDF-SHA512 (#35) | ❌ version-pinned |
| **Proof transcript** (Fiat-Shamir) | challenge differs per agave | ❌ version-pinned |

This four-row table *is* the product thesis: most of the SDK surface is stable, but
two narrow layers are version-pinned and silently break — exactly the footgun
ConfidentialKit makes visible and navigable.

### Real confidential *transfers*, decrypted by the SDK (demo faucet)

We then went past a deposit and exercised the headline feature: **confidential
transfers**. With 5.6.1, the faucet account sent hidden amounts to a batch of fresh
recipients (`configure` → `transfer --confidential` → `apply` each). Every transfer
landed on devnet, and for each the SDK recovered the **hidden transferred amount**
from the recipient's on-chain ciphertext using the recipient's HKDF-derived key —
10 / 10. On Explorer the amounts are pure ciphertext; the SDK reveals them.

This pool drives the demo site's faucet ("reveal a real confidential transfer →
decrypt the hidden amount"), and one entry is locked into CI
(`packages/sdk/src/decode.devnet-transfer.test.ts`). Reproduce with
[`scripts/devnet-confidential-transfers.sh`](../scripts/devnet-confidential-transfers.sh).
