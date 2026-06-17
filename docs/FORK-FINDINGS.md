# Week-1 Fork Findings (empirical)

Run against: **Agave 4.0.1**, **spl-token-cli 5.5.0**, **surfpool 1.0.0**, on a
surfpool mainnet-fork (`surfpool start --network mainnet`). Reproduce with
[`scripts/repro-confidential-flow.sh`](../scripts/repro-confidential-flow.sh).

## TL;DR — the gate is nuanced, and it sharpens the thesis

| Capability | Result on surfpool mainnet-fork |
| --- | --- |
| ZK ElGamal proof program present + executable | ✅ yes (`Executable: true`, owner `NativeLoader`) |
| `configure-confidential-transfer-account` (submits a pubkey-validity proof) | ✅ **succeeds** |
| `deposit-confidential-tokens` | ❌ `InvalidInstructionData` (program build, not a feature gate — also fails with `surfpool --feature enable-all-features`) |
| `apply-pending-balance` | ❌ `InvalidInstructionData` |
| **SDK parser vs. real on-chain account layout** | ✅ **byte-accurate** |

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

## Open next step (full flow → non-zero account)

The remaining work is to make `deposit` succeed so a **non-zero** confidential
balance exists, then validate the decryption path against it end-to-end (derive
the owner AES key from a wallet signature, decrypt the real
`decryptable_available_balance`, assert it equals the deposited amount).

The blocker is purely the program build, not our SDK: deploy a **current**
`spl_token_2022.so` onto the fork at `TokenzQ…` (e.g. `solana program dump` from a
cluster carrying a newer build, or build from `solana-program/token-2022`), then
re-run `scripts/repro-confidential-flow.sh`.

> A sandboxed agent follow-up could not attempt this — its environment blocked
> outbound network and local port binding (`Operation not permitted`), so it
> could neither fetch a program artifact nor start a validator. This is an
> agent-sandbox limitation, **not** a finding about the fork: on the real host,
> surfpool boots fine, `configure` succeeds, and the parser is validated against
> a live account (above). The step just needs a host with network + a current
> Token-2022 artifact.
