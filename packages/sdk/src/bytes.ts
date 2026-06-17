import bs58 from "bs58";
import { InvalidInputError } from "./errors.js";

/** Encode raw bytes as a base58 string (Solana address / key encoding). */
export function bytesToBase58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}

/** Decode a base58 string to bytes. */
export function base58ToBytes(value: string): Uint8Array {
  try {
    return bs58.decode(value);
  } catch (cause) {
    throw new InvalidInputError("base58 string", (cause as Error).message);
  }
}

/** Decode a hex string (optionally `0x`-prefixed) to bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new InvalidInputError("hex string", "odd number of characters");
  }
  if (clean.length > 0 && !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new InvalidInputError("hex string", "contains non-hex characters");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Encode bytes as a lowercase hex string (no prefix). */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Decode a base64 string to bytes (portable across Node and browsers). */
export function base64ToBytes(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  // Node fallback.
  return new Uint8Array(Buffer.from(value, "base64"));
}

/**
 * Decode bytes from a string in one of the supported encodings. Used by the CLI
 * to accept ciphertext/key input flexibly.
 */
export type ByteEncoding = "hex" | "base64" | "base58";

export function decodeBytes(value: string, encoding: ByteEncoding): Uint8Array {
  switch (encoding) {
    case "hex":
      return hexToBytes(value);
    case "base64":
      return base64ToBytes(value);
    case "base58":
      return base58ToBytes(value);
    default: {
      const _exhaustive: never = encoding;
      throw new InvalidInputError("encoding", String(_exhaustive));
    }
  }
}

/** Throw {@link InvalidInputError} unless `value` has exactly `expected` bytes. */
export function assertByteLength(value: Uint8Array, expected: number, what: string): void {
  if (value.length !== expected) {
    throw new InvalidInputError(what, `expected ${expected} bytes, got ${value.length}`);
  }
}

/** Read an unsigned 16-bit little-endian integer. */
export function readU16LE(data: Uint8Array, offset: number): number {
  if (offset + 2 > data.length) {
    throw new InvalidInputError("u16 read", "offset out of bounds");
  }
  return data[offset]! | (data[offset + 1]! << 8);
}

/** Write an unsigned 64-bit little-endian integer into `data` at `offset`. */
export function writeU64LE(data: Uint8Array, offset: number, value: bigint): void {
  if (value < 0n || value > (1n << 64n) - 1n) {
    throw new InvalidInputError("u64 value", "must be in [0, 2^64)");
  }
  if (!Number.isInteger(offset) || offset < 0 || offset + 8 > data.length) {
    throw new InvalidInputError("u64 write", "offset out of bounds");
  }
  let v = value;
  for (let i = 0; i < 8; i++) {
    data[offset + i] = Number(v & 0xffn);
    v >>= 8n;
  }
}

/** Read an unsigned 64-bit little-endian integer as a bigint. */
export function readU64LE(data: Uint8Array, offset: number): bigint {
  if (offset + 8 > data.length) {
    throw new InvalidInputError("u64 read", "offset out of bounds");
  }
  let result = 0n;
  for (let i = 7; i >= 0; i--) {
    result = (result << 8n) | BigInt(data[offset + i]!);
  }
  return result;
}
