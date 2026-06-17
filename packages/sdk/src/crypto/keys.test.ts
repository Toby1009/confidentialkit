import { describe, expect, it } from "vitest";
import {
  aeSignerMessage,
  deriveAeKeyFromSignature,
  deriveElGamalSecretFromSignature,
  elgamalPubkeyFromSecret,
  elgamalSignerMessage,
} from "./keys.js";
import { makeKeys } from "../__fixtures__/confidential-account.js";
import { InvalidInputError } from "../errors.js";
import { AE_KEY_LEN, ELGAMAL_PUBKEY_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

const TEXT = new TextDecoder();

describe("signer messages", () => {
  it("prefixes the ElGamal message and embeds the account address", async () => {
    const addr = new Uint8Array(32).fill(7);
    const msg = await elgamalSignerMessage(addr);
    expect(TEXT.decode(msg.subarray(0, 16))).toBe("ElGamalSecretKey");
    expect(Array.from(msg.subarray(16))).toEqual(Array.from(addr));
  });

  it("prefixes the AE message", async () => {
    const msg = await aeSignerMessage(new Uint8Array(32).fill(7));
    expect(TEXT.decode(msg.subarray(0, 5))).toBe("AeKey");
  });

  it("rejects an address of the wrong length", async () => {
    await expect(elgamalSignerMessage(new Uint8Array(31))).rejects.toBeInstanceOf(InvalidInputError);
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
});
