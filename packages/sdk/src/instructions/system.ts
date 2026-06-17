import { base58ToBytes, writeU64LE } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import type { Address } from "../types.js";
import type { InstructionDescriptor } from "./types.js";

/** The System program address. */
export const SYSTEM_PROGRAM_ADDRESS: Address = "11111111111111111111111111111111";

export interface CreateAccountParams {
  readonly payer: Address;
  readonly newAccount: Address;
  readonly lamports: bigint;
  readonly space: number;
  /** Program that will own the new account (e.g. the ZK program for context state). */
  readonly owner: Address;
}

/**
 * Encode a System `CreateAccount` instruction.
 * Data: `[instruction: u32 LE = 0][lamports: u64 LE][space: u64 LE][owner: 32]`.
 */
export function encodeCreateAccountInstruction(params: CreateAccountParams): InstructionDescriptor {
  const ownerBytes = base58ToBytes(params.owner);
  if (ownerBytes.length !== 32) throw new InvalidInputError("owner", "must be a 32-byte address");
  if (!Number.isSafeInteger(params.space) || params.space < 0) {
    throw new InvalidInputError("space", "must be a non-negative integer");
  }

  const data = new Uint8Array(4 + 8 + 8 + 32);
  // data[0..4] = instruction index 0 (CreateAccount), left as zero.
  writeU64LE(data, 4, params.lamports);
  writeU64LE(data, 12, BigInt(params.space));
  data.set(ownerBytes, 20);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: params.payer, role: "writable-signer" },
      { address: params.newAccount, role: "writable-signer" },
    ],
    data,
  };
}
