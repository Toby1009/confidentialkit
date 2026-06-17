import { describe, expect, it } from "vitest";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  encodeConfidentialTransferInstruction,
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

/**
 * GOLDEN VECTOR — the exact `Transfer` instruction from spl-token-cli's
 * `transfer ... 250 ... --confidential` on a current Token-2022 (surfpool fork).
 */
const REAL_TRANSFER_DATA =
  "1b07728079d37abfe114bb9a1d80d06f91df8f3dc932f3e793481a3b3e5e13a266081a895191f0da6e52d7c443e7e93bff0daad31cd58bb7bbf2d26fb34a0f771457228b7f1d00000000000000000000000000000000000000000000000000000000000000003200b6cd9551b22a8b7a1c9d6749729eb902429cd90383061f7f472d9c20722b0000000000000000000000000000000000000000000000000000000000000000000000";
const TACCOUNTS = {
  sourceTokenAccount: "7iJNbm5MnnRThCpPr1joiUaP2TX4RJh2PAyQvL3tkN5A",
  mint: "7RwQhdZLDpCqCTwvrx3M1cU2t2ZoqEziDVbKM6SLpgf2",
  destinationTokenAccount: "863jfsbc1Y5arDFBDCdxWHrVTfbAzxPxVrZRLyUkxhQS",
  equalityContextState: "3uGzQLQNzrnQrVAuTP5sUfP9CYUcFGj1mLNkpmT4rF1z",
  validityContextState: "3tYiHTUMXWPg1sUtGc3nTB7632ArsNWrM22LQ9bH9rj8",
  rangeContextState: "2cXfSqkJYBdiYZAvjHj2EE5L3PWAGTfGQZJw2P6Sg9Me",
  owner: "HN7yPSafA7aVEp28vNREtmXRemtg4XAeWvH2N85XYYU5",
} as const;

describe("encodeConfidentialTransferInstruction", () => {
  it("matches the real spl-token confidential transfer byte-for-byte", () => {
    const real = hexToBytes(REAL_TRANSFER_DATA);
    const ix = encodeConfidentialTransferInstruction({
      ...TACCOUNTS,
      newSourceDecryptableAvailableBalance: real.subarray(2, 38),
      transferAmountAuditorCiphertextLo: real.subarray(38, 102),
      transferAmountAuditorCiphertextHi: real.subarray(102, 166),
    });

    expect(ix.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(bytesToHex(ix.data)).toBe(REAL_TRANSFER_DATA);
    expect(ix.accounts.map((a) => a.address)).toEqual([
      TACCOUNTS.sourceTokenAccount,
      TACCOUNTS.mint,
      TACCOUNTS.destinationTokenAccount,
      TACCOUNTS.equalityContextState,
      TACCOUNTS.validityContextState,
      TACCOUNTS.rangeContextState,
      TACCOUNTS.owner,
    ]);
    expect(ix.accounts[2]?.role).toBe("writable"); // destination receives
  });

  it("rejects wrong-length ciphertext inputs", () => {
    const real = hexToBytes(REAL_TRANSFER_DATA);
    expect(() =>
      encodeConfidentialTransferInstruction({
        ...TACCOUNTS,
        newSourceDecryptableAvailableBalance: real.subarray(2, 38),
        transferAmountAuditorCiphertextLo: new Uint8Array(10),
        transferAmountAuditorCiphertextHi: real.subarray(102, 166),
      }),
    ).toThrow(InvalidInputError);
  });
});
