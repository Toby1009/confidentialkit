import { describe, expect, it } from "vitest";
import { decodeBalances, type ElGamalProvider } from "./elgamal.js";
import type { ConfidentialBalanceCiphertexts } from "../types.js";
import { DecryptionError } from "../errors.js";

const raw: ConfidentialBalanceCiphertexts = {
  availableBalance: new Uint8Array([1]),
  pendingBalanceLo: new Uint8Array([2]),
  pendingBalanceHi: new Uint8Array([3]),
  decryptableAvailableBalance: new Uint8Array([4]),
};

function fakeProvider(overrides: Partial<ElGamalProvider> = {}): ElGamalProvider {
  return {
    keypairFromSeed: () => ({ publicKey: new Uint8Array(), secretKey: new Uint8Array() }),
    aeKeyFromSeed: () => new Uint8Array(),
    decryptBalance: () => 0n,
    decryptAvailable: () => 0n,
    ...overrides,
  };
}

describe("decodeBalances", () => {
  it("returns no balances and no failure when no key is supplied (inspector mode)", () => {
    const result = decodeBalances(raw, fakeProvider());
    expect(result.availableBalance).toBeUndefined();
    expect(result.pendingBalance).toBeUndefined();
    expect(result.decryptFailed).toBe(false);
  });

  it("uses the AES fast path for the available balance when an aeKey is given", () => {
    const result = decodeBalances(raw, fakeProvider({ decryptAvailable: () => 42n }), {
      aeKey: new Uint8Array([9]),
    });
    expect(result.availableBalance).toBe(42n);
  });

  it("combines pending lo/hi using the secret key", () => {
    const provider = fakeProvider({
      decryptBalance: (ct) => (ct === raw.pendingBalanceHi ? 1n : 5n),
    });
    const result = decodeBalances(raw, provider, { secretKey: new Uint8Array([7]) });
    // pendingLo (5) + pendingHi (1) << 16 = 5 + 65536
    expect(result.pendingBalance).toBe(5n + (1n << 16n));
  });

  it("flags decryptFailed when the provider throws a DecryptionError", () => {
    const provider = fakeProvider({
      decryptBalance: () => {
        throw new DecryptionError();
      },
    });
    const result = decodeBalances(raw, provider, { secretKey: new Uint8Array([7]) });
    expect(result.decryptFailed).toBe(true);
  });
});
