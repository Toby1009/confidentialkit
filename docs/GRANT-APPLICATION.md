# ConfidentialKit — Grant Application (draft)

> Draft for a Superteam Earn / Solana Foundation public-goods or privacy-tooling
> grant. Personalize the **Builder** and **Funding** sections before submitting.

**Project:** ConfidentialKit
**One-liner:** An open-source TypeScript toolkit that makes Solana's Token-2022
**Confidential Balances** actually usable by ordinary developers.
**Repo:** https://github.com/Toby1009/confidentialkit (MIT)
**Category:** Privacy tooling / Developer tooling / Public good (all three).

---

## TL;DR

Confidential transfers on Solana are powerful but brutal to build with: there is
no `spl-token --decrypt`, the flow was historically Rust-only, and a transfer is
a multi-transaction "proof hell" (split ZK proofs uploaded to context-state
accounts). ConfidentialKit is the ergonomic client layer the ecosystem will need
the moment the on-chain ZK ElGamal program re-enables — built today on the new
`@solana/zk-sdk` WASM, **compliance-first** (auditor keys / selective
disclosure), and validated against real on-chain transactions on a mainnet-fork.

**It already works.** This is not a proposal for vapor — the SDK is implemented
and tested (99 tests across 4 packages), with the trickiest pieces validated
*byte-for-byte against real `spl-token` transactions*.

---

## The problem (documented DevEx gap)

- **No decrypt tooling.** `spl-token` has no `--decrypt`; developers see raw
  Pedersen commitments / ElGamal ciphertexts and must hand-roll a client script
  to read a balance (open issue token-2022 **#145**).
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

---

## What's built (current status)

A pnpm monorepo, MIT-licensed, 99 tests, CI green:

| Package | What it does | Status |
| --- | --- | --- |
| `@confidentialkit/sdk` | Parse Token-2022 confidential accounts; decrypt available (AES) + pending (ElGamal) balances; derive owner keys from wallet signatures; **generate the full proof set** (configure / close / withdraw / transfer) over `@solana/zk-sdk`; **encode the Token-2022 + ZK-program instructions**; **orchestrate the multi-transaction plan**. | ✅ |
| `@confidentialkit/cli` | `confidentialkit inspect` + `decrypt` — solves token-2022 #145 (raw ciphertexts → human-readable balances). | ✅ |
| `@confidentialkit/kit` | `@solana/kit` adapter: convert instruction descriptors and **submit the transaction plan** (sign/send/confirm). | ✅ |
| `apps/inspector` | Browser "ciphertext inspector" — decode confidential account state in-browser via WASM; keys never leave the page. | ✅ |

### Validated against real on-chain data, not just unit tests

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

### Compliance-first

Confidential transfers hide **amounts, not identities** — "confidentiality, not
anonymity." ConfidentialKit leans into this: first-class **auditor-key /
selective-disclosure** support (the auditor can decrypt transfer amounts),
sidestepping the Tornado-Cash regulatory framing while serving regulated
confidential-stablecoin use cases.

---

## Why now

- The **Solana Foundation Privacy Hack** (Jan 2026, with Encode Club) ran a
  dedicated **"Privacy Tooling" track judged by the Foundation itself**, backed by
  Light Protocol, Helius, Arcium, Aztec/Noir, Inco, MagicBlock and Range. Privacy
  is an explicit, funded, current strategic priority — and the Foundation shipped
  **Contra** (private execution infra) alongside it.
- Recent privacy raises (Umbra's $154.9M ICO, Arcium ~$11M) show demand is no
  longer niche.
- The cryptographic client tooling is **ready** (`@solana/zk-sdk` WASM), even
  though the on-chain verifier flip is still pending.

---

## Honest caveats (stated up front)

- **Liveness gate.** Solana's native ZK ElGamal proof program has been disabled
  on mainnet and devnet since 2025-06-19 (the "Phantom Challenge" transcript bug);
  as of mid-2026 it remains unavailable (token-2022 #657). We therefore develop
  and demo against a Surfpool mainnet-fork and stay mainnet-ready behind a flag.
- **Version skew (a real finding).** While building, we discovered and documented
  a concrete interop gap: `@solana/zk-sdk` (WASM) proofs self-verify but are
  rejected by the specific on-chain ZK program version a fork bundles, because the
  two derive the Fiat-Shamir challenge from slightly different transcripts. This
  is exactly the kind of DevEx footgun ConfidentialKit exists to surface — we ship
  a one-command compatibility probe for it (`docs/FORK-FINDINGS.md`).
- **Demand is forward-looking.** Real confidential-transfer volume today is
  near-zero (issuers have initialized but not activated the extension). The thesis
  rests on issuer intent + Foundation priority, and we say so plainly.

These are not weaknesses to hide — surfacing them is the product.

---

## Roadmap / milestones

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

---

## What the grant funds

A focused continuation of an already-working public good:

- Cutting milestone 4–5 (version-matrix work, live mainnet/devnet demo on
  re-enablement, npm `0.1`, docs + adoption instrumentation).
- Maintenance as the ecosystem standard SDK for confidential balances.

> **Ask:** [fill in — e.g. a Superteam microgrant up to ~$10K, or a standard
> public-goods grant]. We optimize for protocol-career capital (open-source track
> record, RPGF eligibility) over headline size; ConfidentialKit is built to be the
> public good every confidential-token issuer and privacy app will depend on.

Open-source from commit #1 (MIT), instrumented for a future Retroactive Public
Goods Funding case.

---

## Builder

> Personalize this section.

Privacy / ZK background from the Ethereum ecosystem (Tornado Cash / RAILGUN /
Zcash Orchard / ZK-primitive research) plus a multi-currency stablecoin build
(ForexOS) — all of which transfer directly to Token-2022 confidential-balances
tooling and confidential-stablecoin use cases. ConfidentialKit is the
intersection of that privacy expertise with a documented, unfilled Solana
developer-tooling gap.

---

## Links

- Code: https://github.com/Toby1009/confidentialkit
- Architecture & on-chain validation findings: `docs/FORK-FINDINGS.md`
- Roadmap: `docs/ROADMAP.md`
- End-to-end pipeline demo: `examples/confidential-stablecoin/demo.ts`
