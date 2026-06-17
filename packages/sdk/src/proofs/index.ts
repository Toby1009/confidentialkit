import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
import { subtractAmount } from "../crypto/ciphertext-math.js";
import { ConfidentialKitError, InvalidInputError } from "../errors.js";
import { ELGAMAL_CIPHERTEXT_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

/**
 * Client-side generation of the zero-knowledge proofs that the Token-2022
 * confidential-transfer lifecycle requires, built on the audited `@solana/zk-sdk`
 * WASM. We never implement the proof system — these are thin, ergonomic wrappers
 * that take/return raw bytes so the proofs can be uploaded to the on-chain ZK
 * ElGamal proof program.
 *
 * This module covers the self-contained proofs (account configuration and
 * zero-balance). The transfer/withdraw proofs additionally require homomorphic
 * ciphertext arithmetic to derive the new-balance ciphertext; that builder layer
 * is tracked in docs/ROADMAP.md.
 */
export interface GeneratedProof {
  /**
   * The full proof-data bytes — context ‖ proof — i.e. what the ZK ElGamal proof
   * program reads (inline, or via a context-state account).
   */
  readonly proof: Uint8Array;
  /** Just the public context the proof certifies (for the context-state account). */
  readonly context: Uint8Array;
}

/**
 * Generate a public-key validity proof — used when configuring a confidential
 * account, to certify the account's ElGamal pubkey is well-formed (the prover
 * knows the secret key).
 */
export async function generatePubkeyValidityProof(
  elgamalSecret: Uint8Array,
): Promise<GeneratedProof> {
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  const zk = await getZk();

  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let proof: InstanceType<typeof zk.PubkeyValidityProofData> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    proof = new zk.PubkeyValidityProofData(keypair);
    return extract(proof);
  } finally {
    secret?.free();
    keypair?.free();
    proof?.free();
  }
}

/**
 * Generate a zero-balance proof — certifies that an ElGamal ciphertext encrypts
 * zero. Used to prove an account's confidential balance is empty (e.g. before
 * closing it).
 */
export async function generateZeroBalanceProof(
  elgamalSecret: Uint8Array,
  ciphertext: Uint8Array,
): Promise<GeneratedProof> {
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  const zk = await getZk();

  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let ct: ReturnType<typeof zk.ElGamalCiphertext.fromBytes>;
  let proof: InstanceType<typeof zk.ZeroCiphertextProofData> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    ct = zk.ElGamalCiphertext.fromBytes(ciphertext);
    if (!ct) throw new InvalidInputError("ElGamal ciphertext", "could not deserialize");
    try {
      proof = new zk.ZeroCiphertextProofData(keypair, ct);
    } catch {
      throw new ConfidentialKitError(
        "Could not generate a zero-balance proof — the ciphertext does not encrypt zero under this key",
      );
    }
    return extract(proof);
  } finally {
    secret?.free();
    keypair?.free();
    ct?.free();
    proof?.free();
  }
}

/** The proofs a confidential withdrawal requires. */
export interface WithdrawProofs {
  /** Certifies the new available-balance ciphertext encrypts the new balance. */
  readonly equalityProof: GeneratedProof;
  /** Certifies the new balance is a valid 64-bit non-negative amount. */
  readonly rangeProof: GeneratedProof;
  /** The new available-balance ElGamal ciphertext after the withdrawal. */
  readonly newAvailableCiphertext: Uint8Array;
  /** The remaining confidential balance, base units. */
  readonly newBalance: bigint;
}

export interface WithdrawProofParams {
  /** The account owner's 32-byte ElGamal secret key. */
  readonly elgamalSecret: Uint8Array;
  /** The current available-balance ElGamal ciphertext (64 bytes). */
  readonly currentAvailableCiphertext: Uint8Array;
  /** The current available balance, base units (the owner knows this). */
  readonly currentBalance: bigint;
  /** Amount to move from the confidential balance back to the public balance. */
  readonly withdrawAmount: bigint;
}

/**
 * Generate the equality + range proofs for a confidential withdrawal. Derives
 * the new available-balance ciphertext homomorphically (no secret randomness
 * needed) and proves it encrypts the new balance, which is in range.
 */
export async function generateWithdrawProofs(
  params: WithdrawProofParams,
): Promise<WithdrawProofs> {
  const { elgamalSecret, currentAvailableCiphertext, currentBalance, withdrawAmount } = params;
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  assertByteLength(currentAvailableCiphertext, ELGAMAL_CIPHERTEXT_LEN, "available ciphertext");
  if (withdrawAmount < 0n) throw new InvalidInputError("withdrawAmount", "must be non-negative");
  if (withdrawAmount > currentBalance) {
    throw new InvalidInputError("withdrawAmount", "exceeds the current balance");
  }
  const newBalance = currentBalance - withdrawAmount;
  const newAvailableCiphertext = subtractAmount(currentAvailableCiphertext, withdrawAmount);

  const zk = await getZk();
  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let ct: ReturnType<typeof zk.ElGamalCiphertext.fromBytes>;
  let opening: InstanceType<typeof zk.PedersenOpening> | undefined;
  let commitment: ReturnType<typeof zk.PedersenCommitment.from> | undefined;
  let equality: InstanceType<typeof zk.CiphertextCommitmentEqualityProofData> | undefined;
  let range: InstanceType<typeof zk.BatchedRangeProofU64Data> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    ct = zk.ElGamalCiphertext.fromBytes(newAvailableCiphertext);
    if (!ct) throw new InvalidInputError("ElGamal ciphertext", "could not deserialize");
    opening = new zk.PedersenOpening();
    commitment = zk.PedersenCommitment.from(newBalance, opening);
    try {
      equality = new zk.CiphertextCommitmentEqualityProofData(
        keypair,
        ct,
        commitment,
        opening,
        newBalance,
      );
      range = new zk.BatchedRangeProofU64Data(
        [commitment],
        new BigUint64Array([newBalance]),
        new Uint8Array([64]),
        [opening],
      );
    } catch (cause) {
      throw new ConfidentialKitError(
        "Withdraw proof generation failed — check that currentBalance matches the ciphertext",
        { cause },
      );
    }
    // The range constructor takes ownership of the commitment and opening (the
    // range proof frees them); drop our references so `finally` doesn't double-free.
    commitment = undefined;
    opening = undefined;
    return {
      equalityProof: extract(equality),
      rangeProof: extract(range),
      newAvailableCiphertext,
      newBalance,
    };
  } finally {
    secret?.free();
    keypair?.free();
    ct?.free();
    opening?.free();
    commitment?.free();
    equality?.free();
    range?.free();
  }
}

/** Proof kinds that {@link verifyProof} can validate. */
export type ProofKind =
  | "pubkey-validity"
  | "zero-balance"
  | "ciphertext-commitment-equality"
  | "batched-range-u64";

interface VerifiableProof {
  verify(): void;
  free(): void;
}

type ZkModule = Awaited<ReturnType<typeof getZk>>;

const DESERIALIZERS: Record<ProofKind, (zk: ZkModule, b: Uint8Array) => VerifiableProof> = {
  "pubkey-validity": (zk, b) => zk.PubkeyValidityProofData.fromBytes(b),
  "zero-balance": (zk, b) => zk.ZeroCiphertextProofData.fromBytes(b),
  "ciphertext-commitment-equality": (zk, b) =>
    zk.CiphertextCommitmentEqualityProofData.fromBytes(b),
  "batched-range-u64": (zk, b) => zk.BatchedRangeProofU64Data.fromBytes(b),
};

/**
 * Verify a generated proof with the same logic the on-chain program runs (the
 * audited WASM verifier). Returns `true` if valid, `false` for an invalid or
 * malformed proof. Useful for client-side checks and testing.
 */
export async function verifyProof(kind: ProofKind, proofBytes: Uint8Array): Promise<boolean> {
  const zk = await getZk();
  const deserialize = DESERIALIZERS[kind];
  if (!deserialize) throw new InvalidInputError("proof kind", kind);

  let proof: VerifiableProof;
  try {
    proof = deserialize(zk, proofBytes);
  } catch {
    return false; // malformed bytes
  }
  try {
    proof.verify();
    return true;
  } catch {
    return false;
  } finally {
    proof.free();
  }
}

interface ProofLike {
  toBytes(): Uint8Array;
  context(): { toBytes(): Uint8Array; free(): void };
}

function extract(proof: ProofLike): GeneratedProof {
  const ctx = proof.context();
  try {
    return { proof: proof.toBytes(), context: ctx.toBytes() };
  } finally {
    ctx.free();
  }
}
