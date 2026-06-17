import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import { addAmount, groupedHandleCiphertext, subtractAmount } from "./ciphertext-math.js";
import { decryptElGamalCiphertext } from "./decrypt.js";
import { InvalidInputError } from "../errors.js";

function encrypt(value: bigint, seedByte = 1) {
  const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(seedByte));
  const ct = kp.pubkey().encryptU64(value).toBytes();
  const secret = kp.secret().toBytes();
  kp.free();
  return { ct, secret };
}

describe("subtractAmount / addAmount", () => {
  it("subtracts a public amount (verified by WASM decryption)", async () => {
    const { ct, secret } = encrypt(100n);
    const newCt = subtractAmount(ct, 30n);
    expect(await decryptElGamalCiphertext(newCt, secret)).toBe(70n);
  });

  it("adds a public amount", async () => {
    const { ct, secret } = encrypt(100n);
    expect(await decryptElGamalCiphertext(addAmount(ct, 25n), secret)).toBe(125n);
  });

  it("is a no-op for amount 0 and leaves the handle untouched", async () => {
    const { ct, secret } = encrypt(42n);
    const out = subtractAmount(ct, 0n);
    expect(Array.from(out.subarray(32))).toEqual(Array.from(ct.subarray(32)));
    expect(await decryptElGamalCiphertext(out, secret)).toBe(42n);
  });

  it("round-trips subtract then add", async () => {
    const { ct, secret } = encrypt(500n);
    expect(await decryptElGamalCiphertext(addAmount(subtractAmount(ct, 200n), 200n), secret)).toBe(
      500n,
    );
  });

  it("rejects malformed inputs", () => {
    expect(() => subtractAmount(new Uint8Array(10), 1n)).toThrow(InvalidInputError);
    const { ct } = encrypt(1n);
    expect(() => subtractAmount(ct, -1n)).toThrow(InvalidInputError);
  });

  it("validates the handle point, not just the commitment", () => {
    const { ct } = encrypt(1n);
    const badHandle = Uint8Array.from(ct);
    badHandle.fill(0xff, 32, 64); // non-canonical ristretto encoding
    expect(() => subtractAmount(badHandle, 0n)).toThrow(InvalidInputError);
  });
});

describe("groupedHandleCiphertext", () => {
  it("extracts each party's decryptable ciphertext from a 3-handle grouped ciphertext", async () => {
    const src = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(1));
    const dst = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(2));
    const aud = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(3));
    const opening = new zk.PedersenOpening();
    const grouped = zk.GroupedElGamalCiphertext3Handles.encryptWith(
      src.pubkey(),
      dst.pubkey(),
      aud.pubkey(),
      77n,
      opening,
    ).toBytes();

    // index 0 = source, 1 = destination, 2 = auditor
    expect(await decryptElGamalCiphertext(groupedHandleCiphertext(grouped, 0), src.secret().toBytes())).toBe(77n);
    expect(await decryptElGamalCiphertext(groupedHandleCiphertext(grouped, 1), dst.secret().toBytes())).toBe(77n);
    expect(await decryptElGamalCiphertext(groupedHandleCiphertext(grouped, 2), aud.secret().toBytes())).toBe(77n);
  });

  it("rejects an out-of-range or non-integer handle index", () => {
    for (const bad of [-1, 3, 1.5, Number.NaN]) {
      expect(() => groupedHandleCiphertext(new Uint8Array(128), bad)).toThrow(InvalidInputError);
    }
  });
});
