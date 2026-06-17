import { describe, expect, it } from "vitest";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  encodeConfidentialWithdrawInstruction,
} from "./token2022.js";
import { bytesToHex, hexToBytes } from "../bytes.js";
import { InvalidInputError } from "../errors.js";

/**
 * GOLDEN VECTOR — the exact `Withdraw` instruction emitted by spl-token-cli 5.5.0
 * for `withdraw-confidential-tokens 300` (9 decimals) on a surfpool fork running
 * a current Token-2022. Validates our encoder against the real program's wire format.
 */
const REAL_WITHDRAW_DATA =
  "1b0600b864d945000000097fcce7e06f332fcd4e348a7e3846839a363598654d86dd7799ee085224fe30ad3d07739e0000";
const NEW_DECRYPTABLE =
  "7fcce7e06f332fcd4e348a7e3846839a363598654d86dd7799ee085224fe30ad3d07739e";
const ACCOUNTS = {
  tokenAccount: "957eFoZ4uaHvmAVxX858ajXmn79supBA56g5UhRGv9A8",
  mint: "DZuGCmXyPG6Q9qTyPPRhZv5ridh8VZ3TcmEuUZJvqq7J",
  equalityContextState: "7upzWGCbcXsuJ1zQTVCgszrfxcD5XwaoFhAzCrseJKER",
  rangeContextState: "FRnQxfRJ3rY1sLtfLD1a9im3irJn8J3EgpuPYsPAYGEU",
  owner: "HN7yPSafA7aVEp28vNREtmXRemtg4XAeWvH2N85XYYU5",
} as const;

describe("encodeConfidentialWithdrawInstruction", () => {
  it("matches the real spl-token withdraw instruction byte-for-byte", () => {
    const ix = encodeConfidentialWithdrawInstruction({
      ...ACCOUNTS,
      amount: 300_000_000_000n, // 300 tokens @ 9 decimals
      decimals: 9,
      newDecryptableAvailableBalance: hexToBytes(NEW_DECRYPTABLE),
    });

    expect(ix.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(bytesToHex(ix.data)).toBe(REAL_WITHDRAW_DATA);
    expect(ix.accounts.map((a) => a.address)).toEqual([
      ACCOUNTS.tokenAccount,
      ACCOUNTS.mint,
      ACCOUNTS.equalityContextState,
      ACCOUNTS.rangeContextState,
      ACCOUNTS.owner,
    ]);
    expect(ix.accounts[0]?.role).toBe("writable"); // token account
    expect(ix.accounts[4]?.role).toBe("readonly-signer"); // owner
  });

  it("rejects a wrong-length decryptable balance", () => {
    expect(() =>
      encodeConfidentialWithdrawInstruction({
        ...ACCOUNTS,
        amount: 1n,
        decimals: 9,
        newDecryptableAvailableBalance: new Uint8Array(10),
      }),
    ).toThrow(InvalidInputError);
  });

  it("rejects an amount outside u64", () => {
    expect(() =>
      encodeConfidentialWithdrawInstruction({
        ...ACCOUNTS,
        amount: 1n << 64n,
        decimals: 9,
        newDecryptableAvailableBalance: hexToBytes(NEW_DECRYPTABLE),
      }),
    ).toThrow(InvalidInputError);
  });
});
