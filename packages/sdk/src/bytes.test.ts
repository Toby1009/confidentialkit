import { describe, expect, it } from "vitest";
import {
  base58ToBytes,
  base64ToBytes,
  bytesToBase58,
  bytesToHex,
  decodeBytes,
  hexToBytes,
  readU16LE,
  readU64LE,
} from "./bytes.js";
import { InvalidInputError } from "./errors.js";

describe("hex", () => {
  it("round-trips", () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);
    expect(bytesToHex(bytes)).toBe("0001feff");
    expect(hexToBytes("0001feff")).toEqual(bytes);
  });

  it("accepts a 0x prefix", () => {
    expect(hexToBytes("0xff00")).toEqual(new Uint8Array([255, 0]));
  });

  it("rejects odd-length and non-hex input", () => {
    expect(() => hexToBytes("abc")).toThrow(InvalidInputError);
    expect(() => hexToBytes("zz")).toThrow(InvalidInputError);
  });
});

describe("base64 / base58", () => {
  it("decodes base64", () => {
    expect(base64ToBytes("AAEC")).toEqual(new Uint8Array([0, 1, 2]));
  });

  it("round-trips base58", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(base58ToBytes(bytesToBase58(bytes))).toEqual(bytes);
  });

  it("rejects invalid base58", () => {
    expect(() => base58ToBytes("0OIl")).toThrow(InvalidInputError);
  });

  it("decodeBytes dispatches on encoding", () => {
    expect(decodeBytes("ff", "hex")).toEqual(new Uint8Array([255]));
    expect(decodeBytes("AAEC", "base64")).toEqual(new Uint8Array([0, 1, 2]));
  });
});

describe("integer reads", () => {
  it("reads little-endian u16", () => {
    expect(readU16LE(new Uint8Array([0x34, 0x12]), 0)).toBe(0x1234);
  });

  it("reads little-endian u64 as bigint", () => {
    const data = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(readU64LE(data, 0)).toBe(1n);
    const max = new Uint8Array(8).fill(0xff);
    expect(readU64LE(max, 0)).toBe(2n ** 64n - 1n);
  });

  it("throws when reading past the end", () => {
    expect(() => readU64LE(new Uint8Array(4), 0)).toThrow(InvalidInputError);
    expect(() => readU16LE(new Uint8Array(1), 0)).toThrow(InvalidInputError);
  });
});
