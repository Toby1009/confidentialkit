import type { AeKey, ConfidentialBalanceCiphertexts, ElGamalKeypair } from "../types.js";
import { DecryptionError } from "../errors.js";

/**
 * Twisted-ElGamal key + ciphertext helpers.
 *
 * These are thin seams over `@solana/zk-sdk`. Decryption of a balance ciphertext
 * is a discrete-log recovery over a bounded range (the "decryptable available
 * balance" AES path is the fast option Token-2022 stores precisely to avoid the
 * DLOG walk). Real crypto lands in Week 1; the signatures below are the contract
 * the CLI inspector and SDK depend on.
 */

export interface ElGamalProvider {
  /** Deterministically derive an ElGamal keypair from a wallet signature (seed). */
  keypairFromSeed(seed: Uint8Array): ElGamalKeypair;
  /** Derive the AES key for the decryptable-available-balance fast path. */
  aeKeyFromSeed(seed: Uint8Array): AeKey;
  /** Recover a u64 balance from a balance ciphertext. Throws on failure. */
  decryptBalance(ciphertext: Uint8Array, secretKey: Uint8Array): bigint;
  /** Decrypt the AES "decryptable available balance" blob (fast path). */
  decryptAvailable(ciphertext: Uint8Array, aeKey: AeKey): bigint;
}

/**
 * Decode a confidential-balances account into human-readable amounts when a key
 * is available, or leave them undefined (inspector mode) when it is not.
 */
export function decodeBalances(
  raw: ConfidentialBalanceCiphertexts,
  provider: ElGamalProvider,
  keys?: { secretKey?: Uint8Array; aeKey?: AeKey },
): { availableBalance?: bigint; pendingBalance?: bigint; decryptFailed: boolean } {
  if (!keys?.secretKey && !keys?.aeKey) {
    return { decryptFailed: false };
  }

  try {
    const availableBalance = keys.aeKey
      ? provider.decryptAvailable(raw.decryptableAvailableBalance, keys.aeKey)
      : provider.decryptBalance(raw.availableBalance, keys.secretKey!);

    const pendingBalance = keys.secretKey
      ? provider.decryptBalance(raw.pendingBalanceLo, keys.secretKey) +
        (provider.decryptBalance(raw.pendingBalanceHi, keys.secretKey) << 16n)
      : undefined;

    return { availableBalance, pendingBalance, decryptFailed: false };
  } catch (err) {
    if (err instanceof DecryptionError) {
      return { decryptFailed: true };
    }
    throw err;
  }
}

/**
 * Placeholder ElGamal provider. Throws until `@solana/zk-sdk` is wired (Week 1).
 */
export function createUnimplementedElGamalProvider(): ElGamalProvider {
  const notReady = (): never => {
    throw new Error(
      "ElGamal provider not wired yet: integrate @solana/zk-sdk WASM (Week 1).",
    );
  };
  return {
    keypairFromSeed: notReady,
    aeKeyFromSeed: notReady,
    decryptBalance: notReady,
    decryptAvailable: notReady,
  };
}
