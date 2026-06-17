import { describe, expect, it } from "vitest";
import type { ConfidentialAccountState, DecryptedConfidentialAccount } from "@confidentialkit/sdk";
import { toReport } from "./format.js";

const state: ConfidentialAccountState = {
  account: "Acct111",
  mint: "Mint111",
  elgamalPubkey: new Uint8Array(32).fill(1),
  approved: true,
  allowConfidentialCredits: true,
  allowNonConfidentialCredits: false,
  pendingBalanceCreditCounter: 2n,
  maximumPendingBalanceCreditCounter: 65536n,
  expectedPendingBalanceCreditCounter: 0n,
  actualPendingBalanceCreditCounter: 0n,
  ciphertexts: {
    pendingBalanceLo: new Uint8Array(64).fill(2),
    pendingBalanceHi: new Uint8Array(64).fill(3),
    availableBalance: new Uint8Array(64).fill(4),
    decryptableAvailableBalance: new Uint8Array(36).fill(5),
  },
};

const field = (r: ReturnType<typeof toReport>, label: string) =>
  r.fields.find((f) => f.label === label)?.value;

describe("toReport", () => {
  it("renders decrypted balances", () => {
    const result: DecryptedConfidentialAccount = {
      state,
      availableBalance: 1000n,
      pendingBalance: 7n,
      decryptFailed: false,
    };
    const report = toReport(result);
    expect(field(report, "Available balance")).toBe("1000");
    expect(field(report, "Pending balance")).toBe("7");
    expect(report.warning).toBeUndefined();
    expect(report.ciphertexts).toHaveLength(5);
  });

  it("shows lock placeholders when balances are undefined", () => {
    const report = toReport({ state, decryptFailed: false });
    expect(field(report, "Available balance")).toContain("🔒");
    expect(field(report, "Pending balance")).toContain("🔒");
  });

  it("surfaces a warning when decryption failed", () => {
    const report = toReport({ state, decryptFailed: true });
    expect(report.warning).toBeDefined();
  });
});
