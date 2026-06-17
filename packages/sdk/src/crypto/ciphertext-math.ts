import { ristretto255 } from "@noble/curves/ed25519.js";
import { assertByteLength } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import { ELGAMAL_CIPHERTEXT_LEN } from "../types.js";

const Point = ristretto255.Point;

/**
 * Homomorphic arithmetic on twisted-ElGamal ciphertexts, used to derive the
 * "new balance" ciphertext that the transfer/withdraw proofs certify.
 *
 * A ciphertext is `(C, D)` where the commitment `C = value·G + r·H` and the
 * handle `D = r·P`. Adding/subtracting a *public* amount `a` only shifts the
 * value generator term: `C ± a·G`, leaving the handle (and randomness `r`)
 * untouched — so the result encrypts `value ± a` under the same key.
 *
 * `G` is the ristretto255 basepoint (verified against `@solana/zk-sdk`'s own
 * decryption in the test suite). We compose audited `@noble/curves` point ops;
 * we do not implement the curve.
 */

function commitmentPoint(ciphertext: Uint8Array): InstanceType<typeof Point> {
  try {
    return Point.fromBytes(ciphertext.subarray(0, 32));
  } catch (cause) {
    throw new InvalidInputError("ElGamal ciphertext", "commitment is not a valid ristretto point");
  }
}

function withCommitment(ciphertext: Uint8Array, newCommitment: InstanceType<typeof Point>): Uint8Array {
  const out = new Uint8Array(ELGAMAL_CIPHERTEXT_LEN);
  out.set(newCommitment.toBytes(), 0);
  out.set(ciphertext.subarray(32, 64), 32); // handle unchanged
  return out;
}

/** Subtract a public `amount` from an ElGamal ciphertext: encrypts `value - amount`. */
export function subtractAmount(ciphertext: Uint8Array, amount: bigint): Uint8Array {
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  if (amount < 0n) throw new InvalidInputError("amount", "must be non-negative");
  const c = commitmentPoint(ciphertext);
  const newC = amount === 0n ? c : c.subtract(Point.BASE.multiply(amount));
  return withCommitment(ciphertext, newC);
}

/** Add a public `amount` to an ElGamal ciphertext: encrypts `value + amount`. */
export function addAmount(ciphertext: Uint8Array, amount: bigint): Uint8Array {
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  if (amount < 0n) throw new InvalidInputError("amount", "must be non-negative");
  const c = commitmentPoint(ciphertext);
  const newC = amount === 0n ? c : c.add(Point.BASE.multiply(amount));
  return withCommitment(ciphertext, newC);
}
