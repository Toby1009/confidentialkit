import { describe, expect, it } from "vitest";
import { parseConfidentialAccount } from "./confidential-account.js";
import { base64ToBytes, bytesToHex } from "../bytes.js";
import { REAL_CONFIGURED_ACCOUNT_BASE64 } from "../__fixtures__/real-account.js";

/**
 * Validates the parser against output from the *real* spl-token-2022 program
 * (captured on a surfpool mainnet-fork), not just our own fixtures — this is the
 * cross-check that the byte offsets match the on-chain layout.
 */
describe("parseConfidentialAccount against a real configured account", () => {
  const data = base64ToBytes(REAL_CONFIGURED_ACCOUNT_BASE64);
  const state = parseConfidentialAccount(data, "GMsoaTCsm4g2w5873uKgWYLBKw1e7HNPrTtmPjR3qzNw");

  it("parses the mint and flags", () => {
    expect(state.mint).toBe("68x3Mhj8NYSqmhFjA9DmY5oRMXGJ9b6QQRXeKfeZTUy1");
    expect(state.approved).toBe(true);
    expect(state.allowConfidentialCredits).toBe(true);
    expect(state.allowNonConfidentialCredits).toBe(true);
  });

  it("parses the credit counters", () => {
    expect(state.pendingBalanceCreditCounter).toBe(0n);
    expect(state.maximumPendingBalanceCreditCounter).toBe(65536n);
    expect(state.expectedPendingBalanceCreditCounter).toBe(0n);
    expect(state.actualPendingBalanceCreditCounter).toBe(0n);
  });

  it("extracts the ciphertexts at the correct offsets", () => {
    // These exact bytes were emitted by the on-chain program; matching them
    // proves our offsets/lengths line up with the real account layout.
    expect(bytesToHex(state.elgamalPubkey)).toBe(
      "e0e8a0827f6ac1a7d3a4ac91bbff104b804e02882f637e43c03e37a2e6065f3e",
    );
    expect(state.ciphertexts.pendingBalanceLo).toHaveLength(64);
    expect(state.ciphertexts.pendingBalanceHi).toHaveLength(64);
    expect(state.ciphertexts.availableBalance).toHaveLength(64);
    expect(state.ciphertexts.decryptableAvailableBalance).toHaveLength(36);
    // Pending/available are zero ElGamal ciphertexts on a fresh account.
    expect(state.ciphertexts.availableBalance.every((b) => b === 0)).toBe(true);
    // The AES decryptable-available-balance is a real, non-zero ciphertext.
    expect(bytesToHex(state.ciphertexts.decryptableAvailableBalance)).toMatch(/^d17701d8/);
  });
});
