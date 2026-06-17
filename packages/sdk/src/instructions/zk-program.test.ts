import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import {
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
  encodeCloseContextStateInstruction,
  encodeVerifyProofInstruction,
} from "./zk-program.js";
import { generatePubkeyValidityProof } from "../proofs/index.js";

describe("encodeVerifyProofInstruction", () => {
  it("inline: discriminator + proof bytes, no accounts", async () => {
    const secret = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(7)).secret().toBytes();
    const { proof } = await generatePubkeyValidityProof(secret);
    const ix = encodeVerifyProofInstruction("pubkey-validity", proof);

    expect(ix.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS);
    expect(ix.accounts).toEqual([]);
    expect(ix.data[0]).toBe(4); // VerifyPubkeyValidity
    expect(Array.from(ix.data.subarray(1))).toEqual(Array.from(proof));
  });

  it("context-state: writes context to the account with [account, authority]", () => {
    const ix = encodeVerifyProofInstruction("batched-range-u64", new Uint8Array([1, 2, 3]), {
      account: "Ctx111",
      authority: "Auth111",
    });
    expect(ix.data[0]).toBe(6);
    expect(ix.accounts).toEqual([
      { address: "Ctx111", role: "writable" },
      { address: "Auth111", role: "readonly" },
    ]);
  });

  it("uses the right discriminators for each kind", () => {
    const d = new Uint8Array(4);
    expect(encodeVerifyProofInstruction("zero-balance", d).data[0]).toBe(1);
    expect(encodeVerifyProofInstruction("ciphertext-commitment-equality", d).data[0]).toBe(3);
    expect(encodeVerifyProofInstruction("batched-range-u128", d).data[0]).toBe(7);
    expect(
      encodeVerifyProofInstruction("batched-grouped-ciphertext-3-handles-validity", d).data[0],
    ).toBe(12);
  });
});

describe("encodeCloseContextStateInstruction", () => {
  it("discriminator 0 with [contextState(w), destination(w), authority(signer)]", () => {
    const ix = encodeCloseContextStateInstruction("Ctx111", "Dest111", "Auth111");
    expect(ix.programAddress).toBe(ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS);
    expect(Array.from(ix.data)).toEqual([0]);
    expect(ix.accounts).toEqual([
      { address: "Ctx111", role: "writable" },
      { address: "Dest111", role: "writable" },
      { address: "Auth111", role: "readonly-signer" },
    ]);
  });
});
