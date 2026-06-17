import { InvalidInputError } from "../errors.js";
import type { Address } from "../types.js";
import type { ProofKind } from "./index.js";

/** The native ZK ElGamal proof program address. */
export const ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS: Address =
  "ZkE1Gama1Proof11111111111111111111111111111";

/**
 * `ProofInstruction` discriminators (the on-chain enum order). Mapped from our
 * {@link ProofKind} names.
 */
const VERIFY_DISCRIMINATOR: Record<ProofKind, number> = {
  "zero-balance": 1,
  "ciphertext-commitment-equality": 3,
  "pubkey-validity": 4,
  "batched-range-u64": 6,
  "batched-range-u128": 7,
  "batched-grouped-ciphertext-3-handles-validity": 12,
};

/** A minimal, library-agnostic instruction descriptor (maps to `@solana/kit`). */
export interface ZkProofInstruction {
  readonly programAddress: Address;
  /** Empty for inline verification; a context-state account pair otherwise. */
  readonly accounts: readonly { readonly address: Address; readonly role: "writable" | "readonly" }[];
  readonly data: Uint8Array;
}

/**
 * Encode an **inline** ZK ElGamal `Verify*` instruction: the proof travels in the
 * instruction data and is verified on the spot (no context-state account).
 *
 * Inline mode requires the whole proof to fit in one transaction (~1232 bytes),
 * which holds for small proofs like pubkey-validity. Larger proofs (transfer)
 * need the context-state-account flow — tracked in docs/ROADMAP.md.
 */
export function encodeVerifyProofInstruction(
  kind: ProofKind,
  proofBytes: Uint8Array,
): ZkProofInstruction {
  const discriminator = VERIFY_DISCRIMINATOR[kind];
  if (discriminator === undefined) throw new InvalidInputError("proof kind", kind);

  const data = new Uint8Array(1 + proofBytes.length);
  data[0] = discriminator;
  data.set(proofBytes, 1);

  return { programAddress: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS, accounts: [], data };
}
