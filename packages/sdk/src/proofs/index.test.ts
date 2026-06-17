import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import {
  generatePubkeyValidityProof,
  generateZeroBalanceProof,
  verifyProof,
} from "./index.js";
import { ConfidentialKitError, InvalidInputError } from "../errors.js";

/** Build a deterministic ElGamal keypair and return secret + pubkey objects. */
function keys(seedByte = 1) {
  const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(seedByte));
  const secret = kp.secret().toBytes();
  const pubkey = kp.pubkey();
  return { secret, pubkey, free: () => kp.free() };
}

describe("generatePubkeyValidityProof", () => {
  it("produces a proof the WASM verifier accepts", async () => {
    const k = keys();
    const { proof, context } = await generatePubkeyValidityProof(k.secret);
    expect(proof.length).toBe(96);
    expect(context.length).toBe(32);
    expect(await verifyProof("pubkey-validity", proof)).toBe(true);
    k.free();
  });

  it("rejects a tampered proof", async () => {
    const k = keys();
    const { proof } = await generatePubkeyValidityProof(k.secret);
    const last = proof.length - 1;
    proof[last] = (proof[last] ?? 0) ^ 0xff;
    expect(await verifyProof("pubkey-validity", proof)).toBe(false);
    k.free();
  });

  it("rejects a malformed secret key", async () => {
    await expect(generatePubkeyValidityProof(new Uint8Array(10))).rejects.toBeInstanceOf(
      InvalidInputError,
    );
  });
});

describe("generateZeroBalanceProof", () => {
  it("proves a zero ciphertext and verifies", async () => {
    const k = keys();
    const ct0 = k.pubkey.encryptU64(0n).toBytes();
    const { proof } = await generateZeroBalanceProof(k.secret, ct0);
    expect(await verifyProof("zero-balance", proof)).toBe(true);
    k.free();
  });

  it("refuses to prove a non-zero ciphertext", async () => {
    const k = keys();
    const ct5 = k.pubkey.encryptU64(5n).toBytes();
    await expect(generateZeroBalanceProof(k.secret, ct5)).rejects.toBeInstanceOf(
      ConfidentialKitError,
    );
    k.free();
  });

  it("a zero-balance proof does not verify as pubkey-validity", async () => {
    const k = keys();
    const { proof } = await generateZeroBalanceProof(k.secret, k.pubkey.encryptU64(0n).toBytes());
    expect(await verifyProof("pubkey-validity", proof)).toBe(false);
    k.free();
  });
});
