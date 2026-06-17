import { describe, expect, it } from "vitest";
import { decodeConfidentialAccount } from "./decode.js";
import { hexToBytes } from "./bytes.js";
import {
  REAL_NONZERO_ACCOUNT_BASE64,
  REAL_NONZERO_AE_KEY_HEX,
  REAL_NONZERO_AVAILABLE,
} from "./__fixtures__/real-nonzero-account.js";

/**
 * End-to-end validation against the *real* program output: a confidential
 * account produced by an actual deposit + apply-pending flow (Token-2022
 * v11.0.0 on a surfpool fork). The SDK decrypts the on-chain AES ciphertext with
 * the owner's real derived key and must recover the deposited amount.
 */
describe("decode a real non-zero confidential account", () => {
  const accountData = new Uint8Array(Buffer.from(REAL_NONZERO_ACCOUNT_BASE64, "base64"));
  const aeKey = hexToBytes(REAL_NONZERO_AE_KEY_HEX);

  it("decrypts the available balance produced by the real program", async () => {
    const result = await decodeConfidentialAccount(accountData, { keys: { aeKey } });
    expect(result.availableBalance).toBe(REAL_NONZERO_AVAILABLE);
    expect(result.decryptFailed).toBe(false);
  });

  it("returns raw ciphertexts in inspector mode", async () => {
    const result = await decodeConfidentialAccount(accountData);
    expect(result.availableBalance).toBeUndefined();
    expect(result.state.ciphertexts.decryptableAvailableBalance).toHaveLength(36);
  });
});
