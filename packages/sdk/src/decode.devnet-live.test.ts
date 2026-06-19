import { describe, expect, it } from "vitest";
import { decodeConfidentialAccount } from "./decode.js";
import { hexToBytes, bytesToHex } from "./bytes.js";
import {
  DEVNET_LIVE_ACCOUNT,
  DEVNET_LIVE_ACCOUNT_BASE64,
  DEVNET_LIVE_AE_KEY_HEX,
  DEVNET_LIVE_AVAILABLE,
  DEVNET_LIVE_ELGAMAL_PUBKEY_HEX,
  DEVNET_LIVE_MINT,
} from "./__fixtures__/devnet-live-account.js";

/**
 * End-to-end validation against a real account captured live from **public
 * devnet** (agave 4.1.0-rc.1), provisioned with the version-matched
 * `spl-token-cli` 5.6.1. The SDK must parse the on-chain layout and decrypt the
 * non-zero confidential balance with the owner's HKDF-derived AES key.
 */
describe("decode the live public-devnet confidential account", () => {
  const accountData = new Uint8Array(Buffer.from(DEVNET_LIVE_ACCOUNT_BASE64, "base64"));
  const aeKey = hexToBytes(DEVNET_LIVE_AE_KEY_HEX);

  it("parses the on-chain layout (mint, approved, ElGamal pubkey)", async () => {
    const { state } = await decodeConfidentialAccount(accountData, { account: DEVNET_LIVE_ACCOUNT });
    expect(state.mint).toBe(DEVNET_LIVE_MINT);
    expect(state.approved).toBe(true);
    expect(bytesToHex(state.elgamalPubkey)).toBe(DEVNET_LIVE_ELGAMAL_PUBKEY_HEX);
  });

  it("decrypts the non-zero available balance produced on devnet", async () => {
    const result = await decodeConfidentialAccount(accountData, { account: DEVNET_LIVE_ACCOUNT, keys: { aeKey } });
    expect(result.decryptFailed).toBe(false);
    expect(result.availableBalance).toBe(DEVNET_LIVE_AVAILABLE);
  });

  it("rejects a wrong key", async () => {
    const wrong = hexToBytes("00000000000000000000000000000000");
    const result = await decodeConfidentialAccount(accountData, { account: DEVNET_LIVE_ACCOUNT, keys: { aeKey: wrong } });
    expect(result.decryptFailed).toBe(true);
    expect(result.availableBalance).toBeUndefined();
  });
});
