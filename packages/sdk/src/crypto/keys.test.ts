import { describe, expect, it } from "vitest";
import {
  aeSignerMessage,
  deriveAeKeyFromSignature,
  deriveElGamalSecretFromSignature,
  elgamalPubkeyFromSecret,
  elgamalSignerMessage,
} from "./keys.js";
import { makeKeys } from "../__fixtures__/confidential-account.js";
import { hexToBytes, bytesToHex } from "../bytes.js";
import { REAL_NONZERO_AE_KEY_HEX } from "../__fixtures__/real-nonzero-account.js";
import { InvalidInputError } from "../errors.js";
import { AE_KEY_LEN, ELGAMAL_PUBKEY_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

const TEXT = new TextDecoder();

describe("signer messages", () => {
  it("defaults to the owner-wide (empty-seed) message used by spl-token-cli", async () => {
    expect(TEXT.decode(await elgamalSignerMessage())).toBe("ElGamalSecretKey");
    expect(TEXT.decode(await aeSignerMessage())).toBe("AeKey");
  });

  it("supports the per-account scheme via an explicit 32-byte seed", async () => {
    const addr = new Uint8Array(32).fill(7);
    const msg = await elgamalSignerMessage(addr);
    expect(TEXT.decode(msg.subarray(0, 16))).toBe("ElGamalSecretKey");
    expect(Array.from(msg.subarray(16))).toEqual(Array.from(addr));
  });
});

describe("key derivation", () => {
  const signature = new Uint8Array(64).fill(42);

  it("derives keys deterministically from a signature", async () => {
    const a = await deriveElGamalSecretFromSignature(signature);
    const b = await deriveElGamalSecretFromSignature(signature);
    expect(a.length).toBe(ELGAMAL_SECRET_LEN);
    expect(Array.from(a)).toEqual(Array.from(b));

    const ae = await deriveAeKeyFromSignature(signature);
    expect(ae.length).toBe(AE_KEY_LEN);
  });

  it("derives the public key matching a known secret", async () => {
    const keys = makeKeys();
    const pubkey = await elgamalPubkeyFromSecret(keys.elgamalSecret);
    expect(pubkey.length).toBe(ELGAMAL_PUBKEY_LEN);
    expect(Array.from(pubkey)).toEqual(Array.from(keys.elgamalPubkey));
  });

  it("rejects a malformed secret key", async () => {
    await expect(elgamalPubkeyFromSecret(new Uint8Array(10))).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a signature of the wrong length", async () => {
    await expect(deriveAeKeyFromSignature(new Uint8Array(10))).rejects.toBeInstanceOf(InvalidInputError);
  });

  // The empty-seed (owner-wide) derivation must reproduce the AES key of the real
  // captured account. AE_SIGNATURE is the payer's ed25519 signature over b"AeKey"
  // (a public value); it derives REAL_NONZERO_AE_KEY_HEX used to decrypt that account.
  it("reproduces the real captured account's AES key from a real signature", async () => {
    const AE_SIGNATURE_HEX =
      "ee3587046d4fbd3726969ad1f8c30630d8f2bab5ecef382b0674293b3be22ebab32c897f5138867acfc85c23dba8a5bd25f7d12432fbac1899c1955e47c3a600";
    const aeKey = await deriveAeKeyFromSignature(hexToBytes(AE_SIGNATURE_HEX));
    expect(bytesToHex(aeKey)).toBe(REAL_NONZERO_AE_KEY_HEX);
  });
});
