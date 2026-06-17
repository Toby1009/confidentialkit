# Changelog

All notable changes to ConfidentialKit. Versions are shared across
`@confidentialkit/sdk`, `@confidentialkit/cli`, and `@confidentialkit/kit`.

## 0.2.0

### Breaking

- **`@confidentialkit/sdk` is now network-free.** Removed the `ConfidentialKit`
  client class and `fetchAccountData` from the core SDK so it has zero network
  capability (better for supply-chain audits, browser/edge use, and tree-shaking).
  The offline `decodeConfidentialAccount(bytes, …)` is unchanged.
- **RPC reads moved to the network layer:**
  - `@confidentialkit/kit` gains `inspectConfidentialAccount(rpc, account, keys?)`
    (fetch via `@solana/kit` + decode).
  - `@confidentialkit/cli` keeps its own RPC client (a CLI talking to an RPC is
    expected to make network calls).

### Added

- Release CI with **npm provenance** (verifiable builds from GitHub Actions).
- `socket.yml` triaging the legitimate network capability of the CLI/kit.

## 0.1.0

- First npm release: `@confidentialkit/sdk`, `@confidentialkit/cli`,
  `@confidentialkit/kit`.
- Full pipeline: parse/decrypt confidential accounts, key derivation, ZK proof
  generation (configure/close/withdraw/transfer), Token-2022 + ZK-program
  instruction encoding, multi-transaction orchestration, and `@solana/kit`
  submission. Validated byte-for-byte against real `spl-token` transactions on a
  mainnet fork.
