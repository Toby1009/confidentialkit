/**
 * GOLDEN FIXTURE — a real Token-2022 confidential account with a NON-ZERO
 * balance, captured live from **public devnet** (not a fork) on 2026-06-17.
 *
 * Provisioned with `spl-token-cli` 5.6.1 (built on `solana-zk-sdk` 7.0.x,
 * version-matched to devnet's agave 4.1.0-rc.1) via configure → deposit → apply.
 * See docs/FORK-FINDINGS.md ("Live on public devnet").
 *
 * Account:  736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo
 * Mint:     HfgBdtQ9u3FGDEFaxf9KS2hcCwR5pLBfh6y1dwTSWB4q
 * Explorer: https://explorer.solana.com/address/736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo?cluster=devnet
 *
 * The AES key was derived with the **new HKDF-SHA512 KDF** (empty public seed =
 * owner-wide); its ElGamal pubkey reproduces the on-chain pubkey exactly. These
 * are throwaway local test keys, safe to commit as vectors.
 */
export const DEVNET_LIVE_ACCOUNT = "736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo";
export const DEVNET_LIVE_MINT = "HfgBdtQ9u3FGDEFaxf9KS2hcCwR5pLBfh6y1dwTSWB4q";

export const DEVNET_LIVE_ACCOUNT_BASE64 =
  "96NdyWIcHdgDC2erXDYTKZ4w14HdoYwzZem2NdQrQx53l9GoTFgLItyThpqJPfDVH5nQVknZFMFh+/3UsdVLpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgcAAAAFACcBAezwchWbdt5tCHJNkwLy00OKkPAdZMAm1/LDtWwsmPkuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuYGnglLfIqmyRsmKXLwAcaJzwGlKUGaQe2nXS5YuzdIStVigOM0X5chx+cMNgbsTqbruzlXO+1Yc0N0IfqL4Dr+RrDWtUgGIsu6tpcoq3U5yMSSl37uVcbhriYcUFea/C/DWXAQEAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAABAAAAAAAAAA==";

/** AES key (hex) — HKDF-SHA512 derivation, owner-wide. Decrypts the balance. */
export const DEVNET_LIVE_AE_KEY_HEX = "886bc73cf4ee9ceafe3c4af18ec9dad1";

/** On-chain ElGamal pubkey (hex) — reproduced exactly by the HKDF derivation. */
export const DEVNET_LIVE_ELGAMAL_PUBKEY_HEX =
  "ecf072159b76de6d08724d9302f2d3438a90f01d64c026d7f2c3b56c2c98f92e";

/** Decrypted available balance, base units (600 tokens @ 9 decimals). */
export const DEVNET_LIVE_AVAILABLE = 600000000000n;
