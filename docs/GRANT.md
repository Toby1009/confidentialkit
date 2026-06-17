# Grant Pitch — ConfidentialKit

## One-liner
An open-source developer toolkit that makes Solana's Confidential Balances
actually usable — closing the documented DevEx gap (no `--decrypt`, historically
Rust-only, multi-tx proof hell) that Arcium and others cite as a key blocker to
confidential-DeFi adoption.

## Why now / strategic alignment
- Built on the new `@solana/zk-sdk` WASM proof library (2026).
- Compliance-first: auditor keys / selective disclosure → **confidentiality, not
  anonymity**, dodging Tornado-Cash regulatory framing.
- Mainnet-ready for the moment the ZK ElGamal program re-enables.
- A public good every confidential-token issuer (PYUSD, USDG, AUSD have
  initialized the extension) and privacy app will need.
- Aligns with the Solana Foundation **Privacy Hack** (Jan 2026) "Privacy Tooling"
  track and the Foundation's Contra private-execution infrastructure.

## Category framing
ConfidentialKit sits at the intersection of all three grant lanes:
- **Developer tooling** — easiest to ship; the SDK/CLI is itself a live product.
- **Public goods** — open-source (MIT), npm-published, adoption-instrumented.
- **Privacy infrastructure** — the builder's deepest expertise.

Frame as **public-good + privacy-tooling intersection**, *not* "a privacy app" —
this avoids both the regulatory framing and the liveness trap.

## Honest caveats (state these in the pitch)
- Biggest risk: ZK ElGamal re-enablement timeline (slipped past Jan 2026,
  unconfirmed mid-2026). Any mainnet end-to-end claim is conditional.
- Current real CT usage is near-zero; demand is forward-looking (issuer intent +
  Foundation priority), not present volume.
- Confidential transfers hide amounts, not identities. Don't over-claim.

## Adoption evidence (second-tranche / future RPGF)
Open-source from commit #1, publish to npm early, instrument downloads + GitHub
stars. That adoption signal is the second-tranche evidence and the future
Retroactive Public Goods Funding case.
