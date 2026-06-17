import { assertByteLength, writeU64LE } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import { AE_CIPHERTEXT_LEN, type Address } from "../types.js";
import type { InstructionDescriptor } from "./types.js";

/** The SPL Token-2022 program address. */
export const TOKEN_2022_PROGRAM_ADDRESS: Address = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/** Token-2022 `ConfidentialTransferExtension` instruction discriminator. */
const CONFIDENTIAL_TRANSFER_EXTENSION = 27;
/** `ConfidentialTransferInstruction::Withdraw` sub-discriminator. */
const WITHDRAW_SUB_INSTRUCTION = 6;
const MAX_U64 = (1n << 64n) - 1n;

export interface ConfidentialWithdrawParams {
  readonly tokenAccount: Address;
  readonly mint: Address;
  /** Context-state account holding the verified ciphertext-commitment-equality proof. */
  readonly equalityContextState: Address;
  /** Context-state account holding the verified batched-range proof. */
  readonly rangeContextState: Address;
  /** The account owner (signs the withdrawal). */
  readonly owner: Address;
  /** Amount to withdraw, base units. */
  readonly amount: bigint;
  /** Mint decimals. */
  readonly decimals: number;
  /** The owner's new AES decryptable-available-balance after the withdrawal (36 bytes). */
  readonly newDecryptableAvailableBalance: Uint8Array;
}

/**
 * Encode the Token-2022 confidential `Withdraw` instruction. The equality and
 * range proofs are supplied via pre-created context-state accounts (the two
 * proof-instruction offsets are therefore `0`).
 *
 * Data layout (49 bytes), validated byte-for-byte against a real spl-token
 * withdrawal in the test suite:
 * `[27][6][amount: u64 LE][decimals: u8][newDecryptableBalance: 36][eqOffset: i8=0][rangeOffset: i8=0]`
 */
export function encodeConfidentialWithdrawInstruction(
  params: ConfidentialWithdrawParams,
): InstructionDescriptor {
  if (params.amount < 0n || params.amount > MAX_U64) {
    throw new InvalidInputError("amount", "must be in [0, 2^64)");
  }
  if (params.decimals < 0 || params.decimals > 255) {
    throw new InvalidInputError("decimals", "must be a u8");
  }
  assertByteLength(
    params.newDecryptableAvailableBalance,
    AE_CIPHERTEXT_LEN,
    "newDecryptableAvailableBalance",
  );

  const data = new Uint8Array(2 + 8 + 1 + AE_CIPHERTEXT_LEN + 2);
  data[0] = CONFIDENTIAL_TRANSFER_EXTENSION;
  data[1] = WITHDRAW_SUB_INSTRUCTION;
  writeU64LE(data, 2, params.amount);
  data[10] = params.decimals;
  data.set(params.newDecryptableAvailableBalance, 11);
  // data[47], data[48] stay 0 — proof-instruction offsets unused (context-state mode).

  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.tokenAccount, role: "writable" },
      { address: params.mint, role: "readonly" },
      { address: params.equalityContextState, role: "readonly" },
      { address: params.rangeContextState, role: "readonly" },
      { address: params.owner, role: "readonly-signer" },
    ],
    data,
  };
}
