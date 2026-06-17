/**
 * Core domain types for ConfidentialKit.
 *
 * These are deliberately framework-agnostic (base58 strings + Uint8Array) so the
 * SDK can adapt to either `@solana/kit` or `@solana/web3.js` at the edges without
 * leaking either dependency into the public type surface.
 */

/** Base58-encoded Solana address (account, mint, program, owner). */
export type Address = string;

/** Base58-encoded transaction signature. */
export type Signature = string;

/**
 * The Token-2022 Confidential Transfer extension splits a balance into a
 * `pending` bucket (incoming transfers land here, un-spendable until applied) and
 * an `available` bucket (spendable). Both are stored on-chain as ElGamal
 * ciphertexts; the raw account exposes only Pedersen commitments + ciphertexts.
 */
export interface ConfidentialBalanceState {
  readonly account: Address;
  readonly mint: Address;
  /** Decrypted available balance, base units. Present only when a key was supplied. */
  readonly availableBalance?: bigint;
  /** Decrypted pending balance, base units. Present only when a key was supplied. */
  readonly pendingBalance?: bigint;
  /** Number of pending credits not yet applied (the on-chain counter). */
  readonly pendingCreditCounter: number;
  /** True when the available-balance ciphertext failed to decrypt with the given key. */
  readonly decryptFailed: boolean;
  /** Raw ciphertext blobs, always present, for the inspector / debugging. */
  readonly raw: ConfidentialBalanceCiphertexts;
}

export interface ConfidentialBalanceCiphertexts {
  readonly availableBalance: Uint8Array;
  readonly pendingBalanceLo: Uint8Array;
  readonly pendingBalanceHi: Uint8Array;
  readonly decryptableAvailableBalance: Uint8Array;
}

/**
 * An ElGamal keypair used to encrypt/decrypt confidential balances. The public
 * key is committed on-chain when the account is configured; the secret key never
 * leaves the client.
 */
export interface ElGamalKeypair {
  readonly publicKey: Uint8Array;
  readonly secretKey: Uint8Array;
}

/** AES key used for the "decryptable available balance" fast path. */
export type AeKey = Uint8Array;

/** The three proof families a confidential transfer requires. */
export type ProofKind = "ciphertext-validity" | "equality" | "range";

/**
 * A generated zero-knowledge proof plus the context-state account it must be
 * written to. Confidential-transfer proofs exceed Solana's 1232-byte transaction
 * limit, so they are uploaded to context-state accounts across sequential
 * transactions rather than inlined.
 */
export interface GeneratedProof {
  readonly kind: ProofKind;
  readonly data: Uint8Array;
}
