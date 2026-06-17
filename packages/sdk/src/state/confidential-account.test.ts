import { describe, expect, it } from "vitest";
import { parseConfidentialAccount } from "./confidential-account.js";
import { buildConfidentialAccount, makeKeys } from "../__fixtures__/confidential-account.js";
import { bytesToBase58 } from "../bytes.js";
import { ExtensionNotFoundError, InvalidInputError } from "../errors.js";

const keys = makeKeys();

describe("parseConfidentialAccount", () => {
  it("parses scalar fields and ciphertext blobs", () => {
    const mint = new Uint8Array(32).fill(9);
    const data = buildConfidentialAccount({
      keys,
      mint,
      approved: true,
      pendingBalanceCreditCounter: 3n,
    });

    const state = parseConfidentialAccount(data, "TheAccountAddr");

    expect(state.account).toBe("TheAccountAddr");
    expect(state.mint).toBe(bytesToBase58(mint));
    expect(state.approved).toBe(true);
    expect(state.allowConfidentialCredits).toBe(true);
    expect(state.pendingBalanceCreditCounter).toBe(3n);
    expect(state.maximumPendingBalanceCreditCounter).toBe(65536n);
    expect(Array.from(state.elgamalPubkey)).toEqual(Array.from(keys.elgamalPubkey));

    expect(state.ciphertexts.pendingBalanceLo.length).toBe(64);
    expect(state.ciphertexts.pendingBalanceHi.length).toBe(64);
    expect(state.ciphertexts.availableBalance.length).toBe(64);
    expect(state.ciphertexts.decryptableAvailableBalance.length).toBe(36);
  });

  it("reflects approved=false", () => {
    const data = buildConfidentialAccount({ keys, approved: false });
    expect(parseConfidentialAccount(data).approved).toBe(false);
  });

  it("throws when the extension is absent", () => {
    expect(() => parseConfidentialAccount(new Uint8Array(165))).toThrow(ExtensionNotFoundError);
  });

  it("throws when the data is too short for a mint", () => {
    expect(() => parseConfidentialAccount(new Uint8Array(8))).toThrow(InvalidInputError);
  });
});
