import type { ProofKind } from "../proofs/index.js";

/**
 * On-chain byte size of a ZK ElGamal **context-state account** for each proof
 * kind: a 33-byte header (`authority: 32` + `proof_type: 1`) followed by the
 * proof's context. These were captured from the `System.CreateAccount` space
 * field of real spl-token confidential-transfer transactions on a fork.
 *
 * (Both batched-range variants share a fixed-size context, hence the same 297.)
 */
export const CONTEXT_STATE_ACCOUNT_SIZE: Partial<Record<ProofKind, number>> = {
  "ciphertext-commitment-equality": 161,
  "batched-grouped-ciphertext-3-handles-validity": 385,
  "batched-range-u64": 297,
  "batched-range-u128": 297,
};
