import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
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

/** Proof kinds that {@link verifyProof} can validate. */
export type ProofKind = "pubkey-validity" | "zero-balance";

/**
 * Verify a generated proof with the same logic the on-chain program runs (the
 * audited WASM verifier). Returns `true` if valid, `false` otherwise. Useful for
 * client-side checks and testing.
 */
export async function verifyProof(kind: ProofKind, proofBytes: Uint8Array): Promise<boolean> {
  const zk = await getZk();
  try {
    switch (kind) {
      case "pubkey-validity": {
        const p = zk.PubkeyValidityProofData.fromBytes(proofBytes);
        try {
          p.verify();
          return true;
        } finally {
          p.free();
        }
      }
      case "zero-balance": {
        const p = zk.ZeroCiphertextProofData.fromBytes(proofBytes);
        try {
          p.verify();
          return true;
        } finally {
          p.free();
        }
      }
      default: {
        const _exhaustive: never = kind;
        throw new InvalidInputError("proof kind", String(_exhaustive));
      }
    }
  } catch (err) {
    if (err instanceof InvalidInputError) throw err;
    return false;
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
