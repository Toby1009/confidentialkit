import { readU16LE } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import { ACCOUNT_TYPE_OFFSET, AccountType, ExtensionType, TLV_START } from "./extension.js";

/**
 * Locate a single TLV-encoded extension within a Token-2022 account's data.
 *
 * The extension region is a sequence of `[type: u16 LE][length: u16 LE][data]`
 * entries beginning after the base account and its `AccountType` byte. A `type`
 * of `0` (Uninitialized) marks the end of meaningful entries.
 *
 * @returns the extension's data slice (a view into `data`), or `undefined` if
 *   the account carries no extensions of that type.
 */
export function findExtension(
  data: Uint8Array,
  extensionType: number,
): Uint8Array | undefined {
  // No room for the account-type byte means a bare base account: no extensions.
  if (data.length <= ACCOUNT_TYPE_OFFSET) return undefined;

  const accountType = data[ACCOUNT_TYPE_OFFSET]!;
  if (accountType !== AccountType.Account) {
    // Not a token account (could be a mint or uninitialized); nothing to walk.
    return undefined;
  }

  let cursor = TLV_START;
  while (cursor + 4 <= data.length) {
    const type = readU16LE(data, cursor);
    const length = readU16LE(data, cursor + 2);
    const dataStart = cursor + 4;

    if (type === ExtensionType.Uninitialized) break;
    if (dataStart + length > data.length) {
      throw new InvalidInputError(
        "TLV extension",
        `entry of type ${type} claims length ${length} past end of account data`,
      );
    }

    if (type === extensionType) {
      return data.subarray(dataStart, dataStart + length);
    }
    cursor = dataStart + length;
  }

  return undefined;
}
