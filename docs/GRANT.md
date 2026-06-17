# ConfidentialKit — Grant Application

> Single source for the grant pitch (quick version + full application). Draft for
> a Superteam Earn / Solana Foundation public-goods or privacy-tooling grant.
> Personalize the **Builder** and **Funding** sections before submitting.

**Project:** ConfidentialKit — an open-source TypeScript toolkit that makes
Solana's Token-2022 **Confidential Balances** usable by ordinary developers.
**Repo:** https://github.com/Toby1009/confidentialkit (MIT)
**Category:** Privacy tooling / Developer tooling / Public good (all three).

---

## Quick version (field-sized)

**One-liner.** An open-source TypeScript toolkit that makes Solana's Token-2022
Confidential Balances usable by ordinary developers.

**Problem (≈50 words).** Confidential transfers on Solana are brutal to build
with: no `spl-token --decrypt` (token-2022 #145), historically Rust-only, and a
multi-transaction "proof hell" (three split ZK proofs uploaded to context-state
accounts). Arcium and others cite this DevEx as a key blocker to confidential-DeFi
adoption. No incumbent SDK fills the gap.

**Solution (≈60 words).** A pnpm monorepo over the new `@solana/zk-sdk` WASM:
parse + decrypt confidential accounts, derive owner keys from wallet signatures,
generate the full proof set (configure/close/withdraw/transfer), encode the
Token-2022 + ZK-program instructions, orchestrate the multi-transaction plan, and
submit via `@solana/kit`. CLI + browser inspector included. **Compliance-first**:
auditor keys / selective disclosure — confidentiality, not anonymity.

**Traction — it already works (≈50 words).** Implemented and tested: 99 tests
across 4 packages, CI green. The hard parts are validated **byte-for-byte against
real `spl-token` transactions** on a mainnet fork: the account parser, decryption
of a real non-zero balance, the Withdraw and Transfer instruction encoders, and
live multi-transaction submission. Not a proposal — working code.

**Why now (≈30 words).** The Solana Foundation's Privacy Hack (Jan 2026) ran a
Foundation-judged "Privacy Tooling" track and shipped Contra; PYUSD/USDG/AUSD have
initialized the extension. The client tooling is ready ahead of on-chain
re-enablement.

**Honest caveat (≈30 words).** The native ZK ElGamal program is disabled on
mainnet/devnet (token-2022 #657), so we develop against a Surfpool fork and stay
mainnet-ready. We also found and documented a real `@solana/zk-sdk` ↔ on-chain
proof version skew.

**Ask.** `[fill in]` — a public good every confidential-token issuer and privacy
app will need. Open-source from commit #1; instrumented for future Retroactive PGF.

---

## Full application

### The problem (documented DevEx gap)

- **No decrypt tooling.** `spl-token` has no `--decrypt`; developers see raw
  Pedersen commitments / ElGamal ciphertexts and must hand-roll a client script to
  read a balance (open issue token-2022 **#145**).
- **Historically Rust-only.** Proof generation lived in Rust; JS/TS builders had
  nothing until `@solana/zk-sdk` (WASM) shipped.
- **Multi-transaction proof hell.** A confidential transfer needs three split
  proofs (equality, ciphertext-validity, range) that exceed the 1232-byte
  transaction limit, so they must be uploaded to context-state accounts across
  several sequenced transactions, then closed.
- Arcium and others publicly cite this DevEx as a key blocker to
  confidential-DeFi adoption.

Every confidential-token issuer (PYUSD, USDG, AUSD have already *initialized* the
extension) and every privacy-aware app will need an ergonomic client SDK. There
is **no dominant incumbent SDK** in this niche. ConfidentialKit fills it.

### What's built (current status)

A pnpm monorepo, MIT-licensed, 99 tests, CI green:

| Package | What it does | Status |
| --- | --- | --- |
| `@confidentialkit/sdk` | Parse Token-2022 confidential accounts; decrypt available (AES) + pending (ElGamal) balances; derive owner keys from wallet signatures; **generate the full proof set** (configure / close / withdraw / transfer) over `@solana/zk-sdk`; **encode the Token-2022 + ZK-program instructions**; **orchestrate the multi-transaction plan**. | ✅ |
| `@confidentialkit/cli` | `confidentialkit inspect` + `decrypt` — solves token-2022 #145 (raw ciphertexts → human-readable balances). | ✅ |
| `@confidentialkit/kit` | `@solana/kit` adapter: convert instruction descriptors and **submit the transaction plan** (sign/send/confirm). | ✅ |
| `apps/inspector` | Browser "ciphertext inspector" — decode confidential account state in-browser via WASM; keys never leave the page. | ✅ |

**Validated against real on-chain data, not just unit tests:**

- The account **parser** is validated byte-for-byte against a real configured
  account captured from a live `spl-token-2022` program.
- The SDK **decrypts a real non-zero balance** (600 tokens) from a real account,
  using keys derived from the owner's wallet signature exactly as `spl-token-cli`
  does.
- The **Withdraw and Transfer instruction encoders** are validated *byte-for-byte*
  against real `spl-token` transactions captured on a Surfpool mainnet-fork.
- The **transaction-submission mechanism** lands and confirms multi-transaction
  plans on the fork end-to-end.
- All ZK proofs the SDK generates are checked with the WASM verifier — the same
  verification logic the on-chain program runs.

**Compliance-first.** Confidential transfers hide **amounts, not identities** —
"confidentiality, not anonymity." ConfidentialKit makes **auditor-key /
selective-disclosure** support first-class (the auditor can decrypt transfer
amounts), sidestepping the Tornado-Cash regulatory framing while serving regulated
confidential-stablecoin use cases.

### Why now

- The **Solana Foundation Privacy Hack** (Jan 2026, with Encode Club) ran a
  dedicated **"Privacy Tooling" track judged by the Foundation itself**, backed by
  Light Protocol, Helius, Arcium, Aztec/Noir, Inco, MagicBlock and Range — and the
  Foundation shipped **Contra** (private execution infra) alongside it. Privacy is
  an explicit, funded, current strategic priority.
- Recent privacy raises (Umbra's $154.9M ICO, Arcium ~$11M) show demand is no
  longer niche.
- The cryptographic client tooling is **ready** (`@solana/zk-sdk` WASM), even
  though the on-chain verifier flip is still pending.

### Category framing

ConfidentialKit sits at the intersection of all three grant lanes:

- **Developer tooling** — easiest to ship; the SDK/CLI is itself a live product.
- **Public goods** — open-source (MIT), npm-published, adoption-instrumented.
- **Privacy infrastructure** — the builder's deepest expertise.

Frame as the **public-good + privacy-tooling intersection**, *not* "a privacy
app" — this avoids both the regulatory framing and the liveness trap.

### Honest caveats (stated up front)

- **Liveness gate.** Solana's native ZK ElGamal proof program has been disabled on
  mainnet and devnet since 2025-06-19 (the "Phantom Challenge" transcript bug); as
  of mid-2026 it remains unavailable (token-2022 #657). We therefore develop and
  demo against a Surfpool mainnet-fork and stay mainnet-ready behind a flag.
- **Version skew (a real finding).** We discovered and documented a concrete
  interop gap: `@solana/zk-sdk` (WASM) proofs self-verify but are rejected by the
  specific on-chain ZK program version a fork bundles, because the two derive the
  Fiat-Shamir challenge from slightly different transcripts. This is exactly the
  DevEx footgun ConfidentialKit exists to surface — we ship a one-command
  compatibility probe (`docs/FORK-FINDINGS.md`).
- **Demand is forward-looking.** Real confidential-transfer volume today is
  near-zero (issuers have initialized but not activated the extension). The thesis
  rests on issuer intent + Foundation priority, and we say so plainly.

These are not weaknesses to hide — surfacing them is the product.

### Roadmap / milestones

1. **(Done)** Read path: parse + decrypt + key derivation + CLI + web inspector,
   validated against real on-chain accounts.
2. **(Done)** Proof generation for the full lifecycle + homomorphic ciphertext
   arithmetic, each WASM-verified.
3. **(Done)** Instruction encoding + multi-transaction orchestration + `@solana/kit`
   submission, validated byte-for-byte against real `spl-token` transactions.
4. **(Next)** Resolve the `@solana/zk-sdk` ↔ on-chain version matrix and land a
   full confidential transfer live on a version-matched program; publish `0.1` to
   npm; instrument adoption (downloads, stars).
5. **(Next)** Wallet-adapter integration, a worked confidential-stablecoin guide,
   and a published compatibility table per cluster.

### What the grant funds

A focused continuation of an already-working public good:

- Cutting milestones 4–5 (version-matrix work, live mainnet/devnet demo on
  re-enablement, npm `0.1`, docs + adoption instrumentation).
- Maintenance as the ecosystem standard SDK for confidential balances.

> **Ask:** `[fill in — e.g. a Superteam microgrant up to ~$10K, or a standard
> public-goods grant]`. Optimize for protocol-career capital (open-source track
> record, RPGF eligibility) over headline size.

Open-source from commit #1 (MIT), instrumented for a future Retroactive Public
Goods Funding case (downloads + GitHub stars are the second-tranche / RPGF
evidence).

### Builder

> Add your own background here (identity/links, relevant experience, prior
> shipped work). Keep it grounded in what the code already demonstrates — e.g.
> that this project surfaced and documented a real `@solana/zk-sdk` ↔ on-chain
> proof-transcript version skew (`docs/FORK-FINDINGS.md`), and that the SDK is
> already implemented, tested, and validated against real on-chain transactions
> rather than proposed for future work.

### Links

- Code: https://github.com/Toby1009/confidentialkit
- Architecture & on-chain validation findings: `docs/FORK-FINDINGS.md`
- Roadmap: `docs/ROADMAP.md`
- End-to-end pipeline demo: `examples/confidential-stablecoin/demo.ts`
