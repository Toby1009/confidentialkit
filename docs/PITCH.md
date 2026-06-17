# ConfidentialKit — one-page pitch

Short version for grant-form fields. See `GRANT-APPLICATION.md` for the full draft.

**Repo:** https://github.com/Toby1009/confidentialkit (MIT)

---

### One-liner

An open-source TypeScript toolkit that makes Solana's Token-2022 **Confidential
Balances** usable by ordinary developers.

### Problem (≈50 words)

Confidential transfers on Solana are brutal to build with: no `spl-token
--decrypt` (token-2022 #145), historically Rust-only, and a multi-transaction
"proof hell" (three split ZK proofs uploaded to context-state accounts). Arcium
and others cite this DevEx as a key blocker to confidential-DeFi adoption. No
incumbent SDK fills the gap.

### Solution (≈60 words)

A pnpm monorepo over the new `@solana/zk-sdk` WASM: parse + decrypt confidential
accounts, derive owner keys from wallet signatures, generate the full proof set
(configure/close/withdraw/transfer), encode the Token-2022 + ZK-program
instructions, orchestrate the multi-transaction plan, and submit via
`@solana/kit`. CLI + browser inspector included. **Compliance-first**: auditor
keys / selective disclosure — confidentiality, not anonymity.

### Traction — it already works (≈50 words)

Implemented and tested: 99 tests across 4 packages, CI green. The hard parts are
validated **byte-for-byte against real `spl-token` transactions** on a mainnet
fork: the account parser, decryption of a real non-zero balance, the Withdraw and
Transfer instruction encoders, and live multi-transaction submission. Not a
proposal — working code.

### Why now (≈30 words)

The Solana Foundation's Privacy Hack (Jan 2026) ran a Foundation-judged "Privacy
Tooling" track and shipped Contra; PYUSD/USDG/AUSD have initialized the extension.
The client tooling is ready ahead of the on-chain re-enablement.

### Honest caveat (≈30 words)

The native ZK ElGamal program is disabled on mainnet/devnet (token-2022 #657), so
we develop against a Surfpool fork and stay mainnet-ready. We also found and
documented a real `@solana/zk-sdk` ↔ on-chain proof version skew.

### Ask

`[fill in]` — a public good every confidential-token issuer and privacy app will
need. Open-source from commit #1; instrumented for future Retroactive PGF.
