import { describe, expect, it } from "vitest";
import { decodeConfidentialAccount } from "./decode.js";
import { hexToBytes } from "./bytes.js";
import {
  DEVNET_TRANSFER_ACCOUNT,
  DEVNET_TRANSFER_ACCOUNT_BASE64,
  DEVNET_TRANSFER_AE_KEY_HEX,
  DEVNET_TRANSFER_AMOUNT,
} from "./__fixtures__/devnet-transfer-account.js";

/**
 * End-to-end validation against a real *confidential transfer* on public devnet:
 * the faucet sent a hidden amount to this recipient with the version-matched
 * spl-token-cli 5.6.1. The SDK must recover the transferred amount with the
 * recipient's key — the recipient's view of "how much did I receive?".
 */
describe("decode an account that received a confidential transfer on devnet", () => {
  const accountData = new Uint8Array(Buffer.from(DEVNET_TRANSFER_ACCOUNT_BASE64, "base64"));
  const aeKey = hexToBytes(DEVNET_TRANSFER_AE_KEY_HEX);

  it("decrypts the confidentially-transferred amount", async () => {
    const result = await decodeConfidentialAccount(accountData, {
      account: DEVNET_TRANSFER_ACCOUNT,
      keys: { aeKey },
    });
    expect(result.decryptFailed).toBe(false);
    expect(result.availableBalance).toBe(DEVNET_TRANSFER_AMOUNT);
  });

  it("rejects a wrong key", async () => {
    const result = await decodeConfidentialAccount(accountData, {
      account: DEVNET_TRANSFER_ACCOUNT,
      keys: { aeKey: new Uint8Array(16) },
    });
    expect(result.decryptFailed).toBe(true);
    expect(result.availableBalance).toBeUndefined();
  });
});
