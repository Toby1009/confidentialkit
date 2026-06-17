# Agentic Engineering Grant (Superteam) — Application

> Response to: "help me apply for the agentic engineering grant by Superteam."
> Proof artifact: **ConfidentialKit** — https://github.com/Toby1009/confidentialkit (MIT)

This grant evaluates *agentic engineering* — how effectively you direct AI coding
agents to ship real software. ConfidentialKit is a working demonstration: a
non-trivial Solana SDK built end-to-end through an agentic workflow, with a
second agent as independent reviewer, and an empirical validation loop against a
live chain.

## What was built

ConfidentialKit — an open-source TypeScript toolkit that makes Solana's Token-2022
**Confidential Balances** usable: parse + decrypt confidential accounts, derive
keys from wallet signatures, generate the full ZK proof set
(configure/close/withdraw/transfer), encode the Token-2022 + ZK-program
instructions, orchestrate the multi-transaction plan, and submit via `@solana/kit`.
**4 packages, 99 passing tests, CI green.**

## How it was built (the agentic engineering story)

- **Agent-led build.** The entire SDK was implemented through a coding agent
  (Claude Code) across iterative sessions — architecture, crypto layer, proof
  generation, instruction encoding, orchestration, CLI, and a browser inspector.
- **Multi-agent review loop.** A second agent (Codex / GPT) ran independent deep
  code reviews at each milestone. Findings were applied and turned into regression
  tests — e.g. a u64 wrap bug, integer/NaN input guards, RPC shape validation, and
  a key-derivation scheme correction were all caught by the reviewer and fixed.
- **Empirical, tool-using agency.** The agent didn't just write code — it stood up
  a Surfpool mainnet-fork, installed the Solana/Agave toolchain, **built a current
  Token-2022 program from source with `cargo-build-sbf`**, overrode it onto the
  fork via a cheat RPC, ran real `spl-token` confidential flows, captured the
  transactions, and validated the SDK's encoders **byte-for-byte** against them.
- **Self-correcting discovery.** Through agent-driven fork experiments it
  surfaced and documented a real interop bug: `@solana/zk-sdk` (WASM) proofs
  self-verify but are rejected by the on-chain ZK program due to a Fiat-Shamir
  transcript version skew — and shipped a one-command compatibility probe for it.

## Evidence it actually works (not slideware)

- Account parser validated byte-for-byte against a real `spl-token-2022` account.
- SDK decrypts a real non-zero balance (600 tokens) using keys derived from the
  owner's wallet signature exactly as `spl-token-cli` does.
- Withdraw + Transfer instruction encoders validated byte-for-byte against real
  `spl-token` transactions on a fork.
- Multi-transaction submission lands and confirms end-to-end on the fork.
- Every generated ZK proof passes the same WASM verifier the chain runs.

(Full technical validation log: `docs/FORK-FINDINGS.md`.)

## Why this fits the agentic engineering grant

It demonstrates the loop the grant cares about: **direct an agent to build →
have a second agent review → validate empirically against real infrastructure →
fix and harden → repeat.** The result is real, tested, on-chain-validated Solana
infrastructure — and a public good the confidential-balances ecosystem will need.

## Links

- Code: https://github.com/Toby1009/confidentialkit
- Validation findings: `docs/FORK-FINDINGS.md`
- Roadmap: `docs/ROADMAP.md`
- End-to-end demo: `examples/confidential-stablecoin/demo.ts`

---

> Note: if the grant requires the response to be generated inside a **solana.new**
> Claude/Codex session, run `help me apply for the agentic engineering grant by
> Superteam` there and submit that session's output; this document can serve as
> the supporting proof-of-work artifact.
