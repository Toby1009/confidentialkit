/**
 * Core domain types for ConfidentialKit.
 *
 * Addresses are base58 strings; ciphertexts and keys are raw `Uint8Array`. This
 * keeps the public surface free of any particular Solana client library.
 */

/** Base58-encoded Solana address (account, mint, program, owner). */
export type Address = string;

/** Base58-encoded transaction signature. */
export type Signature = string;

/**
 * The raw ciphertext fields of the Token-2022 `ConfidentialTransferAccount`
 * extension, exactly as stored on-chain. Always parseable without any key —
 * this is the "inspector" view that powers debugging (token-2022#145).
 *
 * Balances are split into a `pending` bucket (incoming transfers land here,
 * un-spendable until applied) and an `available` bucket (spendable). The
 * available balance is duplicated as an AES "decryptable" ciphertext that the
 * owner can read instantly without a discrete-log search.
 */
export interface ConfidentialAccountState {
  /** The token-account address, if it was supplied to the parser. */
  readonly account?: Address;
  /** The mint, parsed from the base token-account data. */
  readonly mint: Address;
  /** The account's ElGamal public key (32 bytes). */
  readonly elgamalPubkey: Uint8Array;
  /** Whether the account has been approved for confidential transfers. */
  readonly approved: boolean;
  readonly allowConfidentialCredits: boolean;
  readonly allowNonConfidentialCredits: boolean;
  /** On-chain counter of pending credits not yet applied. */
  readonly pendingBalanceCreditCounter: bigint;
  readonly maximumPendingBalanceCreditCounter: bigint;
  readonly expectedPendingBalanceCreditCounter: bigint;
  readonly actualPendingBalanceCreditCounter: bigint;
  /** Raw ciphertext blobs, always present. */
  readonly ciphertexts: ConfidentialCiphertexts;
}

/** Raw ElGamal / AES ciphertext blobs from the extension. */
export interface ConfidentialCiphertexts {
  /** ElGamal ciphertext, low 16 bits of the pending balance (64 bytes). */
  readonly pendingBalanceLo: Uint8Array;
  /** ElGamal ciphertext, bits [16,64) of the pending balance (64 bytes). */
  readonly pendingBalanceHi: Uint8Array;
  /** ElGamal ciphertext of the available balance (64 bytes). */
  readonly availableBalance: Uint8Array;
  /** AES "decryptable available balance" — the owner's fast-path read (36 bytes). */
  readonly decryptableAvailableBalance: Uint8Array;
}

/**
 * A {@link ConfidentialAccountState} with balances decrypted, produced when keys
 * are supplied. The raw `state` is preserved so callers keep access to the
 * ciphertexts.
 */
export interface DecryptedConfidentialAccount {
  readonly state: ConfidentialAccountState;
  /**
   * Spendable balance, base units. Read from the AES decryptable ciphertext
   * (requires the AE key). `undefined` if no AE key was supplied.
   */
  readonly availableBalance?: bigint;
  /**
   * Pending (un-applied) balance, base units. Reconstructed from the lo/hi
   * ElGamal ciphertexts (requires the ElGamal secret key). `undefined` if no
   * ElGamal key was supplied.
   */
  readonly pendingBalance?: bigint;
  /** True when a supplied key failed to decrypt its ciphertext. */
  readonly decryptFailed: boolean;
}

/** Byte length of an ElGamal ciphertext (commitment ‖ handle). */
export const ELGAMAL_CIPHERTEXT_LEN = 64;
/** Byte length of an ElGamal public key. */
export const ELGAMAL_PUBKEY_LEN = 32;
/** Byte length of an ElGamal secret key. */
export const ELGAMAL_SECRET_LEN = 32;
/** Byte length of an AES "decryptable balance" ciphertext. */
export const AE_CIPHERTEXT_LEN = 36;
/** Byte length of an AES key. */
export const AE_KEY_LEN = 16;
