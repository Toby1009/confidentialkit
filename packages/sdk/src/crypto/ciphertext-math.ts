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

function pointAt(bytes: Uint8Array, offset: number): InstanceType<typeof Point> {
  try {
    return Point.fromBytes(bytes.subarray(offset, offset + 32));
  } catch {
    throw new InvalidInputError("ciphertext", "contains an invalid ristretto point");
  }
}

/** Low 16 bits of a transfer amount go in the `lo` component; the next bits in `hi`. */
const TRANSFER_AMOUNT_LO_BITS = 16n;

/** Serialize an ElGamal ciphertext from its commitment + handle points (canonical). */
function assemble(commitment: InstanceType<typeof Point>, handle: InstanceType<typeof Point>): Uint8Array {
  const out = new Uint8Array(ELGAMAL_CIPHERTEXT_LEN);
  out.set(commitment.toBytes(), 0);
  out.set(handle.toBytes(), 32);
  return out;
}

/** Subtract a public `amount` from an ElGamal ciphertext: encrypts `value - amount`. */
export function subtractAmount(ciphertext: Uint8Array, amount: bigint): Uint8Array {
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  if (amount < 0n) throw new InvalidInputError("amount", "must be non-negative");
  const commitment = pointAt(ciphertext, 0);
  const handle = pointAt(ciphertext, 32); // validated, not just copied
  const newC = amount === 0n ? commitment : commitment.subtract(Point.BASE.multiply(amount));
  return assemble(newC, handle);
}

/** Add a public `amount` to an ElGamal ciphertext: encrypts `value + amount`. */
export function addAmount(ciphertext: Uint8Array, amount: bigint): Uint8Array {
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  if (amount < 0n) throw new InvalidInputError("amount", "must be non-negative");
  const commitment = pointAt(ciphertext, 0);
  const handle = pointAt(ciphertext, 32); // validated, not just copied
  const newC = amount === 0n ? commitment : commitment.add(Point.BASE.multiply(amount));
  return assemble(newC, handle);
}

const GROUPED_3_HANDLES_LEN = 128; // commitment ‖ 3 decrypt handles

/**
 * Extract a single party's ElGamal ciphertext `(commitment, handle[index])` from
 * a 3-handle grouped ciphertext. Handle index `0` = source, `1` = destination,
 * `2` = auditor — used to pull the auditor's transfer-amount ciphertext for the
 * confidential `Transfer` instruction.
 */
export function groupedHandleCiphertext(grouped: Uint8Array, handleIndex: number): Uint8Array {
  assertByteLength(grouped, GROUPED_3_HANDLES_LEN, "grouped 3-handle ciphertext");
  if (handleIndex < 0 || handleIndex > 2) {
    throw new InvalidInputError("handleIndex", "must be 0 (source), 1 (destination), or 2 (auditor)");
  }
  const handleOffset = 32 + 32 * handleIndex;
  const out = new Uint8Array(ELGAMAL_CIPHERTEXT_LEN);
  out.set(grouped.subarray(0, 32), 0); // shared commitment
  out.set(grouped.subarray(handleOffset, handleOffset + 32), 32); // this party's handle
  return out;
}

/**
 * Derive the source's new available-balance ciphertext for a confidential
 * transfer: `current − (sourceLo + sourceHi·2^16)`, where each `source*` is the
 * source's own ElGamal component (commitment ‖ handle index 0) of the grouped
 * 3-handle transfer-amount ciphertext. This matches what the Token-2022 program
 * recomputes on-chain, so the resulting ciphertext is the one the equality proof
 * must certify.
 */
export function subtractTransferAmount(
  currentAvailable: Uint8Array,
  groupedLo: Uint8Array,
  groupedHi: Uint8Array,
): Uint8Array {
  assertByteLength(currentAvailable, ELGAMAL_CIPHERTEXT_LEN, "available ciphertext");
  assertByteLength(groupedLo, GROUPED_3_HANDLES_LEN, "grouped lo ciphertext");
  assertByteLength(groupedHi, GROUPED_3_HANDLES_LEN, "grouped hi ciphertext");

  const shift = 1n << TRANSFER_AMOUNT_LO_BITS;
  // Source ElGamal component = (commitment @0, source handle @32).
  const combinedCommitment = pointAt(groupedLo, 0).add(pointAt(groupedHi, 0).multiply(shift));
  const combinedHandle = pointAt(groupedLo, 32).add(pointAt(groupedHi, 32).multiply(shift));

  const out = new Uint8Array(ELGAMAL_CIPHERTEXT_LEN);
  out.set(pointAt(currentAvailable, 0).subtract(combinedCommitment).toBytes(), 0);
  out.set(pointAt(currentAvailable, 32).subtract(combinedHandle).toBytes(), 32);
  return out;
}
