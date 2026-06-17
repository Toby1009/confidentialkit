import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";
import {
  AccountType,
  BASE_ACCOUNT_LEN,
  CT_ACCOUNT_LEN,
  CtAccountLayout as L,
  ExtensionType,
} from "@confidentialkit/sdk";
import { buildKeys, inspectOffline, parseOptionalHexKey } from "./inspector.js";
import { InvalidInputError } from "@confidentialkit/sdk";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");

/** Build a real Token-2022 confidential account using the public SDK layout. */
function buildAccount(available: bigint, pendingLo: bigint) {
  const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(1));
  const ae = zk.AeKey.fromSeed(new Uint8Array(16).fill(1));
  const pub = kp.pubkey();

  const ext = new Uint8Array(CT_ACCOUNT_LEN);
  ext[L.approved] = 1;
  ext.set(pub.toBytes(), L.elgamalPubkey);
  ext.set(pub.encryptU64(pendingLo).toBytes(), L.pendingBalanceLo);
  ext.set(pub.encryptU64(0n).toBytes(), L.pendingBalanceHi);
  ext.set(pub.encryptU64(available).toBytes(), L.availableBalance);
  ext.set(ae.encrypt(available).toBytes(), L.decryptableAvailableBalance);

  const data = new Uint8Array(BASE_ACCOUNT_LEN + 1 + 4 + CT_ACCOUNT_LEN);
  data[BASE_ACCOUNT_LEN] = AccountType.Account;
  const tlv = BASE_ACCOUNT_LEN + 1;
  data[tlv] = ExtensionType.ConfidentialTransferAccount & 0xff;
  data[tlv + 1] = (ExtensionType.ConfidentialTransferAccount >> 8) & 0xff;
  data[tlv + 2] = CT_ACCOUNT_LEN & 0xff;
  data[tlv + 3] = (CT_ACCOUNT_LEN >> 8) & 0xff;
  data.set(ext, tlv + 4);

  const keys = { aeKeyHex: hex(ae.toBytes()), elgamalHex: hex(kp.secret().toBytes()) };
  kp.free();
  ae.free();
  return { base64: b64(data), ...keys };
}

describe("parseOptionalHexKey", () => {
  it("returns undefined for blank input", () => {
    expect(parseOptionalHexKey("   ")).toBeUndefined();
  });

  it("parses a hex key", () => {
    expect(parseOptionalHexKey("00ff")).toEqual(new Uint8Array([0, 255]));
  });

  it("throws on malformed hex", () => {
    expect(() => parseOptionalHexKey("xyz")).toThrow(InvalidInputError);
  });
});

describe("inspectOffline", () => {
  it("decodes and decrypts a pasted account end-to-end", async () => {
    const { base64, aeKeyHex, elgamalHex } = buildAccount(1000n, 7n);
    const result = await inspectOffline(base64, buildKeys(aeKeyHex, elgamalHex));
    expect(result.availableBalance).toBe(1000n);
    expect(result.pendingBalance).toBe(7n);
    expect(result.decryptFailed).toBe(false);
  });

  it("returns raw state when no keys are given", async () => {
    const { base64 } = buildAccount(1000n, 7n);
    const result = await inspectOffline(base64, buildKeys("", ""));
    expect(result.availableBalance).toBeUndefined();
    expect(result.state.ciphertexts.availableBalance.length).toBe(64);
  });
});
