import type { GeneratedProof } from "../types.js";

/**
 * Seam over `@solana/zk-sdk` (the WASM proof library).
 *
 * The real implementation will call into the WASM module to generate
 * ciphertext-validity, equality, and range proofs. We keep it behind an
 * interface so:
 *   - the SDK typechecks and unit-tests without the WASM binary present, and
 *   - the web inspector and Node CLI can inject the WASM loader appropriate to
 *     their environment.
 *
 * Implement `loadZkSdkProver()` in Week 1 once `@solana/zk-sdk` is wired in.
 */
export interface Prover {
  /** Proof that a transfer's ciphertexts are well-formed under the recipient key. */
  ciphertextValidity(input: TransferProofInput): Promise<GeneratedProof>;
  /** Proof that two ciphertexts encrypt the same value (source vs. destination). */
  equality(input: TransferProofInput): Promise<GeneratedProof>;
  /** Range proof that the transferred amount is within [0, 2^64). */
  range(input: TransferProofInput): Promise<GeneratedProof>;
}

export interface TransferProofInput {
  readonly amount: bigint;
  readonly senderSecretKey: Uint8Array;
  readonly senderAvailableCiphertext: Uint8Array;
  readonly recipientPublicKey: Uint8Array;
  /** Optional auditor public key for selective disclosure / compliance. */
  readonly auditorPublicKey?: Uint8Array;
}

/**
 * Placeholder prover. Throws until the `@solana/zk-sdk` WASM binding lands.
 * Tracked as the Week-1 deliverable in docs/ROADMAP.md.
 */
export function createUnimplementedProver(): Prover {
  const notReady = (): never => {
    throw new Error(
      "Prover not wired yet: integrate @solana/zk-sdk WASM in src/proofs (Week 1).",
    );
  };
  return {
    ciphertextValidity: notReady,
    equality: notReady,
    range: notReady,
  };
}
