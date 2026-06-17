import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
import { DecryptionError, InvalidInputError } from "../errors.js";
import {
  AE_CIPHERTEXT_LEN,
  AE_KEY_LEN,
  ELGAMAL_CIPHERTEXT_LEN,
  ELGAMAL_SECRET_LEN,
} from "../types.js";

/**
 * Decrypt an ElGamal ciphertext to a `u64` amount.
 *
 * Decryption performs a bounded discrete-log search, so it is fast for small
 * plaintexts (e.g. the 16-bit `pending_balance_lo`) but can be slow for large
 * values. Prefer {@link decryptAeCiphertext} for the available balance.
 *
 * @throws InvalidInputError on malformed inputs.
 * @throws DecryptionError if the ciphertext does not decrypt under `secret`.
 */
export async function decryptElGamalCiphertext(
  ciphertext: Uint8Array,
  secret: Uint8Array,
): Promise<bigint> {
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  assertByteLength(secret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  const zk = await getZk();

  let secretKey: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let ct: ReturnType<typeof zk.ElGamalCiphertext.fromBytes>;
  try {
    try {
      secretKey = zk.ElGamalSecretKey.fromBytes(secret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    ct = zk.ElGamalCiphertext.fromBytes(ciphertext);
    if (!ct) throw new InvalidInputError("ElGamal ciphertext", "could not deserialize");

    let amount: bigint | undefined;
    try {
      amount = secretKey.decrypt(ct);
    } catch {
      amount = undefined;
    }
    if (amount === undefined) throw new DecryptionError();
    return amount;
  } finally {
    secretKey?.free();
    ct?.free();
  }
}

/**
 * Decrypt an AES "decryptable available balance" ciphertext to a `u64` amount.
 * This is the owner's instant, exact read of the available balance.
 *
 * @throws InvalidInputError on malformed inputs.
 * @throws DecryptionError if the ciphertext does not decrypt under `aeKey`.
 */
export async function decryptAeCiphertext(
  ciphertext: Uint8Array,
  aeKey: Uint8Array,
): Promise<bigint> {
  assertByteLength(ciphertext, AE_CIPHERTEXT_LEN, "AES ciphertext");
  assertByteLength(aeKey, AE_KEY_LEN, "AES key");
  const zk = await getZk();

  let key: ReturnType<typeof zk.AeKey.fromBytes> | undefined;
  let ct: ReturnType<typeof zk.AeCiphertext.fromBytes>;
  try {
    try {
      key = zk.AeKey.fromBytes(aeKey);
    } catch {
      throw new InvalidInputError("AES key", "could not deserialize");
    }
    ct = zk.AeCiphertext.fromBytes(ciphertext);
    if (!ct) throw new InvalidInputError("AES ciphertext", "could not deserialize");

    // AeCiphertext.decrypt returns `undefined` (rather than throwing) on a key
    // mismatch, which is the cleaner branch to consume.
    const amount = ct.decrypt(key);
    if (amount === undefined) throw new DecryptionError();
    return amount;
  } finally {
    key?.free();
    ct?.free();
  }
}
