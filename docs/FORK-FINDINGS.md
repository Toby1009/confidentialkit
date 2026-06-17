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
