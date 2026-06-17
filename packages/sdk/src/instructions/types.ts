import type { Address } from "../types.js";

/**
 * Account roles, mirroring `@solana/kit`'s `AccountRole`. Library-agnostic so the
 * SDK can emit instruction descriptors without depending on a transaction lib.
 */
export type AccountRole = "readonly" | "writable" | "readonly-signer" | "writable-signer";

export interface InstructionAccount {
  readonly address: Address;
  readonly role: AccountRole;
}

/** A minimal instruction descriptor; maps directly onto a `@solana/kit` instruction. */
export interface InstructionDescriptor {
  readonly programAddress: Address;
  readonly accounts: readonly InstructionAccount[];
  readonly data: Uint8Array;
}
