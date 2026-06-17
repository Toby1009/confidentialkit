import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import { generateWithdrawProofs, verifyProof } from "./index.js";
import { decryptElGamalCiphertext } from "../crypto/decrypt.js";
import { ConfidentialKitError, InvalidInputError } from "../errors.js";

function account(balance: bigint, seedByte = 1) {
  const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(seedByte));
  const ct = kp.pubkey().encryptU64(balance).toBytes();
  const secret = kp.secret().toBytes();
  kp.free();
  return { ct, secret };
}

describe("generateWithdrawProofs", () => {
  it("produces equality + range proofs the WASM verifier accepts", async () => {
    const { ct, secret } = account(100n);
    const result = await generateWithdrawProofs({
      elgamalSecret: secret,
      currentAvailableCiphertext: ct,
      currentBalance: 100n,
      withdrawAmount: 30n,
    });

    expect(result.newBalance).toBe(70n);
    expect(await verifyProof("ciphertext-commitment-equality", result.equalityProof.proof)).toBe(true);
    expect(await verifyProof("batched-range-u64", result.rangeProof.proof)).toBe(true);
    // The derived new-balance ciphertext decrypts to the remaining balance.
    expect(await decryptElGamalCiphertext(result.newAvailableCiphertext, secret)).toBe(70n);
  });

  it("supports a full withdrawal to zero", async () => {
    const { ct, secret } = account(50n);
    const result = await generateWithdrawProofs({
      elgamalSecret: secret,
      currentAvailableCiphertext: ct,
      currentBalance: 50n,
      withdrawAmount: 50n,
    });
    expect(result.newBalance).toBe(0n);
    expect(await verifyProof("ciphertext-commitment-equality", result.equalityProof.proof)).toBe(true);
  });

  it("rejects withdrawing more than the balance", async () => {
    const { ct, secret } = account(10n);
    await expect(
      generateWithdrawProofs({
        elgamalSecret: secret,
        currentAvailableCiphertext: ct,
        currentBalance: 10n,
        withdrawAmount: 11n,
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a currentBalance outside u64 (would silently wrap)", async () => {
    const { ct, secret } = account(1n);
    await expect(
      generateWithdrawProofs({
        elgamalSecret: secret,
        currentAvailableCiphertext: ct,
        currentBalance: (1n << 64n) + 100n,
        withdrawAmount: 1n,
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("fails proof generation when currentBalance does not match the ciphertext", async () => {
    const { ct, secret } = account(100n); // ciphertext really encrypts 100
    await expect(
      generateWithdrawProofs({
        elgamalSecret: secret,
        currentAvailableCiphertext: ct,
        currentBalance: 50n, // wrong claim
        withdrawAmount: 30n,
      }),
    ).rejects.toBeInstanceOf(ConfidentialKitError);
  });
});
