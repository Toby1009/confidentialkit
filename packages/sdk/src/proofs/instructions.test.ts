import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  encodeVerifyProofInstruction,
} from "./instructions.js";
import { generatePubkeyValidityProof } from "./index.js";

describe("encodeVerifyProofInstruction", () => {
  it("prefixes the proof with the correct discriminator and targets the ZK program", async () => {
    const secret = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(7)).secret().toBytes();
    const { proof } = await generatePubkeyValidityProof(secret);
    const ix = encodeVerifyProofInstruction("pubkey-validity", proof);

    expect(ix.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS);
    expect(ix.accounts).toEqual([]); // inline verification
    expect(ix.data[0]).toBe(4); // VerifyPubkeyValidity
    expect(ix.data.length).toBe(proof.length + 1);
    expect(Array.from(ix.data.subarray(1))).toEqual(Array.from(proof));
  });

  it("uses the right discriminators for each kind", () => {
    const dummy = new Uint8Array(4);
    expect(encodeVerifyProofInstruction("zero-balance", dummy).data[0]).toBe(1);
    expect(encodeVerifyProofInstruction("ciphertext-commitment-equality", dummy).data[0]).toBe(3);
    expect(encodeVerifyProofInstruction("batched-range-u64", dummy).data[0]).toBe(6);
    expect(encodeVerifyProofInstruction("batched-range-u128", dummy).data[0]).toBe(7);
    expect(
      encodeVerifyProofInstruction("batched-grouped-ciphertext-3-handles-validity", dummy).data[0],
    ).toBe(12);
  });
});
