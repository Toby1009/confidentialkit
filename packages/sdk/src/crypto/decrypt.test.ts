import { describe, expect, it } from "vitest";
import { decryptAeCiphertext, decryptElGamalCiphertext } from "./decrypt.js";
import { buildConfidentialAccount, makeKeys } from "../__fixtures__/confidential-account.js";
import { parseConfidentialAccount } from "../state/confidential-account.js";
import { DecryptionError, InvalidInputError } from "../errors.js";

const keys = makeKeys();
const wrongKeys = makeKeys(2);

function ciphertexts(available: bigint, pendingLo: bigint, pendingHi: bigint) {
  const data = buildConfidentialAccount({ keys, available, pendingLo, pendingHi });
  return parseConfidentialAccount(data).ciphertexts;
}

describe("decryptElGamalCiphertext", () => {
  it("recovers a small pending value", async () => {
    const ct = ciphertexts(0n, 7n, 0n);
    expect(await decryptElGamalCiphertext(ct.pendingBalanceLo, keys.elgamalSecret)).toBe(7n);
  });

  it("throws DecryptionError under the wrong key", async () => {
    const ct = ciphertexts(0n, 7n, 0n);
    await expect(
      decryptElGamalCiphertext(ct.pendingBalanceLo, wrongKeys.elgamalSecret),
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  it("rejects malformed inputs", async () => {
    await expect(decryptElGamalCiphertext(new Uint8Array(10), keys.elgamalSecret))
      .rejects.toBeInstanceOf(InvalidInputError);
    const ct = ciphertexts(0n, 1n, 0n);
    await expect(decryptElGamalCiphertext(ct.pendingBalanceLo, new Uint8Array(10)))
      .rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("decryptAeCiphertext", () => {
  it("recovers the available balance", async () => {
    const ct = ciphertexts(123456n, 0n, 0n);
    expect(await decryptAeCiphertext(ct.decryptableAvailableBalance, keys.aeKey)).toBe(123456n);
  });

  it("throws DecryptionError under the wrong key", async () => {
    const ct = ciphertexts(123456n, 0n, 0n);
    await expect(
      decryptAeCiphertext(ct.decryptableAvailableBalance, wrongKeys.aeKey),
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  it("rejects malformed inputs", async () => {
    await expect(decryptAeCiphertext(new Uint8Array(10), keys.aeKey))
      .rejects.toBeInstanceOf(InvalidInputError);
  });
});
