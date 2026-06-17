import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import { generateTransferProofs, verifyProof } from "./index.js";
import { decryptElGamalCiphertext } from "../crypto/decrypt.js";
import { InvalidInputError } from "../errors.js";

function keypair(seedByte: number) {
  return zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(seedByte));
}

/** Decrypt a grouped transfer-amount ciphertext for a given handle index. */
function recipientAmount(grouped: Uint8Array, secret: ReturnType<typeof keypair>, index: number) {
  const g = zk.GroupedElGamalCiphertext3Handles.fromBytes(grouped);
  const amount = g.decrypt(secret.secret(), index);
  g.free();
  return amount;
}

describe("generateTransferProofs", () => {
  it("produces equality + validity + range proofs the WASM verifier accepts", async () => {
    const source = keypair(1);
    const dest = keypair(2);
    const auditor = keypair(3);
    const currentAvail = source.pubkey().encryptU64(1000n).toBytes();

    const result = await generateTransferProofs({
      sourceElgamalSecret: source.secret().toBytes(),
      sourceCurrentAvailableCiphertext: currentAvail,
      sourceCurrentBalance: 1000n,
      transferAmount: 250n,
      destinationElgamalPubkey: dest.pubkey().toBytes(),
      auditorElgamalPubkey: auditor.pubkey().toBytes(),
    });

    expect(result.newSourceBalance).toBe(750n);
    expect(await verifyProof("ciphertext-commitment-equality", result.equalityProof.proof)).toBe(true);
    expect(
      await verifyProof("batched-grouped-ciphertext-3-handles-validity", result.validityProof.proof),
    ).toBe(true);
    expect(await verifyProof("batched-range-u128", result.rangeProof.proof)).toBe(true);

    // Source's new available ciphertext decrypts to the remaining balance.
    expect(await decryptElGamalCiphertext(result.newSourceAvailableCiphertext, source.secret().toBytes())).toBe(750n);

    // The recipient (handle index 1) can recover the transferred amount: lo + hi<<16.
    expect(result.transferAmountLo).toHaveLength(128);
    const lo = recipientAmount(result.transferAmountLo, dest, 1);
    const hi = recipientAmount(result.transferAmountHi, dest, 1);
    expect(lo + (hi << 16n)).toBe(250n);

    // The auditor (handle index 2) can also recover it (compliance / selective disclosure).
    const aLo = recipientAmount(result.transferAmountLo, auditor, 2);
    const aHi = recipientAmount(result.transferAmountHi, auditor, 2);
    expect(aLo + (aHi << 16n)).toBe(250n);
  });

  it("works without an auditor key", async () => {
    const source = keypair(4);
    const dest = keypair(5);
    const result = await generateTransferProofs({
      sourceElgamalSecret: source.secret().toBytes(),
      sourceCurrentAvailableCiphertext: source.pubkey().encryptU64(100n).toBytes(),
      sourceCurrentBalance: 100n,
      transferAmount: 40n,
      destinationElgamalPubkey: dest.pubkey().toBytes(),
    });
    expect(result.newSourceBalance).toBe(60n);
    expect(await verifyProof("batched-range-u128", result.rangeProof.proof)).toBe(true);
  });

  it("rejects transferring more than the balance", async () => {
    const source = keypair(6);
    const dest = keypair(7);
    await expect(
      generateTransferProofs({
        sourceElgamalSecret: source.secret().toBytes(),
        sourceCurrentAvailableCiphertext: source.pubkey().encryptU64(10n).toBytes(),
        sourceCurrentBalance: 10n,
        transferAmount: 11n,
        destinationElgamalPubkey: dest.pubkey().toBytes(),
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects an amount beyond 48 bits", async () => {
    const source = keypair(8);
    const dest = keypair(9);
    await expect(
      generateTransferProofs({
        sourceElgamalSecret: source.secret().toBytes(),
        sourceCurrentAvailableCiphertext: source.pubkey().encryptU64(1n).toBytes(),
        sourceCurrentBalance: 1n << 50n,
        transferAmount: 1n << 49n,
        destinationElgamalPubkey: dest.pubkey().toBytes(),
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
