import { InvalidInputError } from "../errors.js";
import type { Address } from "../types.js";
import type { ProofKind } from "../proofs/index.js";
import type { InstructionDescriptor } from "./types.js";

/** The native ZK ElGamal proof program address. */
export const ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS: Address =
  "ZkE1Gama1Proof11111111111111111111111111111";

/** `ProofInstruction` discriminators (the on-chain enum order), by {@link ProofKind}. */
const VERIFY_DISCRIMINATOR: Record<ProofKind, number> = {
  "zero-balance": 1,
  "ciphertext-commitment-equality": 3,
  "pubkey-validity": 4,
  "batched-range-u64": 6,
  "batched-range-u128": 7,
  "batched-grouped-ciphertext-3-handles-validity": 12,
};

const CLOSE_CONTEXT_STATE_DISCRIMINATOR = 0;

/** The context-state account + its recorded authority, for proofs uploaded ahead of time. */
export interface ContextStateInfo {
  /** The (pre-created) context-state account the proof context is written to. */
  readonly account: Address;
  /** The authority recorded on the account (must sign to later close it). */
  readonly authority: Address;
}

/**
 * Encode a ZK ElGamal `Verify*` instruction.
 *
 * - Without `contextState`: **inline** verification (proof in instruction data,
 *   no accounts) — only fits proofs under the ~1232-byte transaction limit.
 * - With `contextState`: the program verifies the inline proof and **writes its
 *   context** to the pre-created context-state account (accounts:
 *   `[contextStateAccount (writable), authority (readonly)]`). This is how large
 *   proofs (transfer/withdraw) are staged before the Token-2022 instruction.
 */
export function encodeVerifyProofInstruction(
  kind: ProofKind,
  proofBytes: Uint8Array,
  contextState?: ContextStateInfo,
): InstructionDescriptor {
  const discriminator = VERIFY_DISCRIMINATOR[kind];
  if (discriminator === undefined) throw new InvalidInputError("proof kind", kind);

  const data = new Uint8Array(1 + proofBytes.length);
  data[0] = discriminator;
  data.set(proofBytes, 1);

  const accounts = contextState
    ? ([
        { address: contextState.account, role: "writable" },
        { address: contextState.authority, role: "readonly" },
      ] as const)
    : ([] as const);

  return { programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS, accounts, data };
}

/**
 * Encode a `CloseContextState` instruction to reclaim a context-state account's
 * rent after the Token-2022 instruction has consumed its proof.
 */
export function encodeCloseContextStateInstruction(
  contextStateAccount: Address,
  rentDestination: Address,
  authority: Address,
): InstructionDescriptor {
  return {
    programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
    accounts: [
      { address: contextStateAccount, role: "writable" },
      { address: rentDestination, role: "writable" },
      { address: authority, role: "readonly-signer" },
    ],
    data: new Uint8Array([CLOSE_CONTEXT_STATE_DISCRIMINATOR]),
  };
}
