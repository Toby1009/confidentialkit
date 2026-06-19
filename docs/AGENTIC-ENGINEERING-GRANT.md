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
**4 packages, 101 passing tests, CI green** — plus the full confidential flow
(configure → deposit → **confidential transfer** → apply → decrypt) reproduced
**end-to-end on public devnet**, with the SDK decrypting the resulting live
on-chain accounts.

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
- **Breakthrough on public devnet.** The agent then confirmed the gate on real
  devnet (the official `spl-token-cli` 5.5.0 is rejected too), identified the
  version-matched `spl-token-cli` 5.6.1, and landed the full confidential flow —
  including real **confidential transfers** — on-chain. It root-caused a second
  skew (key derivation migrated SHA3-512 → HKDF-SHA512), wrote a Rust helper to
  reproduce the on-chain keys exactly, and the SDK decrypted the live balances.

## Evidence it actually works (not slideware)

- Account parser validated byte-for-byte against a real `spl-token-2022` account.
- SDK decrypts a real non-zero balance (600 tokens) using keys derived from the
  owner's wallet signature exactly as `spl-token-cli` does.
- Withdraw + Transfer instruction encoders validated byte-for-byte against real
  `spl-token` transactions on a fork.
- Multi-transaction submission lands and confirms end-to-end on the fork.
- Every generated ZK proof passes the same WASM verifier the chain runs.
- **On public devnet:** real confidential transfers landed (configure → transfer
  → apply), and the SDK decrypted each recipient's *hidden* amount live from RPC —
  verifiable on Solana Explorer (links below).

(Full technical validation log: `docs/FORK-FINDINGS.md`.)

## Why this fits the agentic engineering grant

It demonstrates the loop the grant cares about: **direct an agent to build →
have a second agent review → validate empirically against real infrastructure →
fix and harden → repeat.** The result is real, tested, on-chain-validated Solana
infrastructure — and a public good the confidential-balances ecosystem will need.

## Links

- Code: https://github.com/Toby1009/confidentialkit
- Interactive demo (reveal + decrypt a real confidential transfer): `apps/site` <!-- add Vercel URL -->
- On-chain proof (devnet, Explorer):
  - account: https://explorer.solana.com/address/736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo?cluster=devnet
  - confidential transfer tx: https://explorer.solana.com/tx/41zf4Sk1mANE92UoiHL4jkiBfeNgDDsLzq3fVPQPrGubfNPb7i5db1bCdSe6i2iSB6y48FQMrGbJoJLfXWMsgfjr?cluster=devnet
- Validation findings: `docs/FORK-FINDINGS.md`
- Roadmap: `docs/ROADMAP.md`
- End-to-end demo: `examples/confidential-stablecoin/demo.ts`

---

> Note: if the grant requires the response to be generated inside a **solana.new**
> Claude/Codex session, run `help me apply for the agentic engineering grant by
> Superteam` there and submit that session's output; this document can serve as
> the supporting proof-of-work artifact.
