import type { Address } from "../types.js";
import type { ProofKind } from "../proofs/index.js";
import type { InstructionDescriptor } from "./types.js";
import { CONTEXT_STATE_ACCOUNT_SIZE } from "./context-state.js";
import { encodeCreateAccountInstruction } from "./system.js";
import { encodeConfidentialTransferInstruction } from "./token2022.js";
import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  encodeCloseContextStateInstruction,
  encodeVerifyProofInstruction,
} from "./zk-program.js";

const EQUALITY: ProofKind = "ciphertext-commitment-equality";
const VALIDITY: ProofKind = "batched-grouped-ciphertext-3-handles-validity";
const RANGE: ProofKind = "batched-range-u128";

export interface ConfidentialTransferPlanParams {
  /** Fee payer (also funds the context-state accounts' rent). */
  readonly payer: Address;
  /** Source account owner; also the context-state authority. */
  readonly owner: Address;
  readonly sourceTokenAccount: Address;
  readonly mint: Address;
  readonly destinationTokenAccount: Address;

  /** Proof bytes from {@link generateTransferProofs}. */
  readonly equalityProof: Uint8Array;
  readonly validityProof: Uint8Array;
  readonly rangeProof: Uint8Array;

  /** Ephemeral context-state account addresses (caller-generated signers). */
  readonly equalityContextState: Address;
  readonly validityContextState: Address;
  readonly rangeContextState: Address;

  /** Transfer instruction data components. */
  readonly newSourceDecryptableAvailableBalance: Uint8Array;
  readonly transferAmountAuditorCiphertextLo: Uint8Array;
  readonly transferAmountAuditorCiphertextHi: Uint8Array;

  /** Rent-exempt lamports for a given account size (caller wires to their RPC). */
  readonly rentExemptionForSize: (space: number) => bigint;
}

/**
 * Build the ordered transactions for a confidential transfer (split-proof model).
 * Each inner array is one transaction; sign and send them in sequence. Mirrors
 * what spl-token does:
 *
 *   1. create + verify the equality proof into its context-state account
 *   2. create + verify the ciphertext-validity proof
 *   3. create the range context-state account
 *   4. verify the (large) range proof into it
 *   5. the Token-2022 `Transfer`
 *   6. close all three context-state accounts (reclaim rent)
 *
 * Note: actually *landing* these is gated on the `@solana/zk-sdk` ↔ on-chain ZK
 * program proof-version match (see docs/FORK-FINDINGS.md); the encoding itself is
 * validated against real spl-token transactions.
 */
export function buildConfidentialTransferPlan(
  params: ConfidentialTransferPlanParams,
): InstructionDescriptor[][] {
  const sizeOf = (kind: ProofKind): number => CONTEXT_STATE_ACCOUNT_SIZE[kind]!;
  const create = (account: Address, kind: ProofKind): InstructionDescriptor =>
    encodeCreateAccountInstruction({
      payer: params.payer,
      newAccount: account,
      lamports: params.rentExemptionForSize(sizeOf(kind)),
      space: sizeOf(kind),
      owner: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    });
  const verify = (kind: ProofKind, proof: Uint8Array, account: Address): InstructionDescriptor =>
    encodeVerifyProofInstruction(kind, proof, { account, authority: params.owner });

  return [
    [create(params.equalityContextState, EQUALITY), verify(EQUALITY, params.equalityProof, params.equalityContextState)],
    [create(params.validityContextState, VALIDITY), verify(VALIDITY, params.validityProof, params.validityContextState)],
    // The range proof is too large to share a transaction with the account creation.
    [create(params.rangeContextState, RANGE)],
    [verify(RANGE, params.rangeProof, params.rangeContextState)],
    [
      encodeConfidentialTransferInstruction({
        sourceTokenAccount: params.sourceTokenAccount,
        mint: params.mint,
        destinationTokenAccount: params.destinationTokenAccount,
        equalityContextState: params.equalityContextState,
        validityContextState: params.validityContextState,
        rangeContextState: params.rangeContextState,
        owner: params.owner,
        newSourceDecryptableAvailableBalance: params.newSourceDecryptableAvailableBalance,
        transferAmountAuditorCiphertextLo: params.transferAmountAuditorCiphertextLo,
        transferAmountAuditorCiphertextHi: params.transferAmountAuditorCiphertextHi,
      }),
    ],
    [
      encodeCloseContextStateInstruction(params.equalityContextState, params.payer, params.owner),
      encodeCloseContextStateInstruction(params.validityContextState, params.payer, params.owner),
      encodeCloseContextStateInstruction(params.rangeContextState, params.payer, params.owner),
    ],
  ];
}
