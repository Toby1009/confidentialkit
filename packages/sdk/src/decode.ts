import { DecryptionError } from "./errors.js";
import { decryptAeCiphertext, decryptElGamalCiphertext } from "./crypto/decrypt.js";
import { parseConfidentialAccount } from "./state/confidential-account.js";
import type { Address, DecryptedConfidentialAccount } from "./types.js";

/** Keys the owner supplies to decrypt their confidential balances. */
export interface DecryptKeys {
  /** 32-byte ElGamal secret key — unlocks the pending balance. */
  readonly elgamalSecret?: Uint8Array;
  /** 16-byte AES key — unlocks the available balance (fast path). */
  readonly aeKey?: Uint8Array;
}

export interface DecodeOptions {
  /** Token-account address, echoed into the result for context. */
  readonly account?: Address;
  /** Owner keys. Omit for inspector mode (raw ciphertexts only). */
  readonly keys?: DecryptKeys;
}

/** Bits [0,16) live in `pending_balance_lo`; bits [16,48) in `pending_balance_hi`. */
const PENDING_HI_SHIFT = 16n;

/**
 * Parse a Token-2022 confidential account and, when keys are supplied, decrypt
 * its balances. This is the one call behind both the CLI `inspect`/`decrypt` and
 * the web inspector.
 *
 * Decryption failures (wrong key) are reported via `decryptFailed` rather than
 * thrown, so an inspector can still render the raw state; malformed account data
 * still throws.
 */
export async function decodeConfidentialAccount(
  accountData: Uint8Array,
  options: DecodeOptions = {},
): Promise<DecryptedConfidentialAccount> {
  const state = parseConfidentialAccount(accountData, options.account);
  const keys = options.keys;
  if (!keys?.elgamalSecret && !keys?.aeKey) {
    return { state, decryptFailed: false };
  }

  let decryptFailed = false;
  let availableBalance: bigint | undefined;
  let pendingBalance: bigint | undefined;

  if (keys.aeKey) {
    try {
      availableBalance = await decryptAeCiphertext(
        state.ciphertexts.decryptableAvailableBalance,
        keys.aeKey,
      );
    } catch (err) {
      if (!(err instanceof DecryptionError)) throw err;
      decryptFailed = true;
    }
  }

  if (keys.elgamalSecret) {
    try {
      const lo = await decryptElGamalCiphertext(
        state.ciphertexts.pendingBalanceLo,
        keys.elgamalSecret,
      );
      const hi = await decryptElGamalCiphertext(
        state.ciphertexts.pendingBalanceHi,
        keys.elgamalSecret,
      );
      pendingBalance = lo + (hi << PENDING_HI_SHIFT);
    } catch (err) {
      if (!(err instanceof DecryptionError)) throw err;
      decryptFailed = true;
    }
  }

  return { state, availableBalance, pendingBalance, decryptFailed };
}
