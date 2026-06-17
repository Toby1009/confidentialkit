import { describe, expect, it } from "vitest";
import { findExtension } from "./tlv.js";
import { ACCOUNT_TYPE_OFFSET, AccountType, ExtensionType, TLV_START } from "./extension.js";
import { buildConfidentialAccount, makeKeys } from "../__fixtures__/confidential-account.js";
import { InvalidInputError } from "../errors.js";

const keys = makeKeys();

describe("findExtension", () => {
  it("finds the confidential-transfer extension", () => {
    const data = buildConfidentialAccount({ keys });
    const ext = findExtension(data, ExtensionType.ConfidentialTransferAccount);
    expect(ext).toBeDefined();
    expect(ext!.length).toBe(295);
  });

  it("skips a preceding unrelated extension", () => {
    const data = buildConfidentialAccount({ keys, withLeadingExtension: true });
    const ext = findExtension(data, ExtensionType.ConfidentialTransferAccount);
    expect(ext?.length).toBe(295);
  });

  it("returns undefined for a bare base account (no extensions)", () => {
    expect(findExtension(new Uint8Array(165), ExtensionType.ConfidentialTransferAccount))
      .toBeUndefined();
  });

  it("returns undefined when the account-type byte is not Account", () => {
    const data = buildConfidentialAccount({ keys });
    data[ACCOUNT_TYPE_OFFSET] = AccountType.Mint;
    expect(findExtension(data, ExtensionType.ConfidentialTransferAccount)).toBeUndefined();
  });

  it("returns undefined when the requested type is absent", () => {
    const data = buildConfidentialAccount({ keys });
    expect(findExtension(data, 9999)).toBeUndefined();
  });

  it("throws when an entry's length runs past the buffer", () => {
    const data = buildConfidentialAccount({ keys });
    // Corrupt the confidential entry's length field to overflow the buffer.
    data[TLV_START + 2] = 0xff;
    data[TLV_START + 3] = 0xff;
    expect(() => findExtension(data, ExtensionType.ConfidentialTransferAccount))
      .toThrow(InvalidInputError);
  });
});
