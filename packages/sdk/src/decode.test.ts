import { describe, expect, it } from "vitest";
import { decodeConfidentialAccount } from "./decode.js";
import { buildConfidentialAccount, makeKeys } from "./__fixtures__/confidential-account.js";

const keys = makeKeys();
const wrongKeys = makeKeys(2);

describe("decodeConfidentialAccount", () => {
  it("returns raw state only in inspector mode (no keys)", async () => {
    const data = buildConfidentialAccount({ keys, available: 500n });
    const result = await decodeConfidentialAccount(data);
    expect(result.availableBalance).toBeUndefined();
    expect(result.pendingBalance).toBeUndefined();
    expect(result.decryptFailed).toBe(false);
    expect(result.state.ciphertexts.availableBalance.length).toBe(64);
  });

  it("decrypts available (AES) and pending (ElGamal lo+hi)", async () => {
    const data = buildConfidentialAccount({
      keys,
      available: 1_000_000n,
      pendingLo: 5n,
      pendingHi: 3n,
    });
    const result = await decodeConfidentialAccount(data, {
      account: "acct",
      keys: { elgamalSecret: keys.elgamalSecret, aeKey: keys.aeKey },
    });

    expect(result.state.account).toBe("acct");
    expect(result.availableBalance).toBe(1_000_000n);
    expect(result.pendingBalance).toBe(5n + (3n << 16n));
    expect(result.decryptFailed).toBe(false);
  });

  it("decrypts only what the supplied keys allow", async () => {
    const data = buildConfidentialAccount({ keys, available: 42n, pendingLo: 9n });
    const result = await decodeConfidentialAccount(data, { keys: { aeKey: keys.aeKey } });
    expect(result.availableBalance).toBe(42n);
    expect(result.pendingBalance).toBeUndefined();
  });

  it("flags decryptFailed under a wrong key without throwing", async () => {
    const data = buildConfidentialAccount({ keys, available: 42n });
    const result = await decodeConfidentialAccount(data, { keys: { aeKey: wrongKeys.aeKey } });
    expect(result.availableBalance).toBeUndefined();
    expect(result.decryptFailed).toBe(true);
    // Raw state is still available for inspection.
    expect(result.state.mint).toBeDefined();
  });
});
