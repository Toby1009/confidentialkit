import { bytesToBase58, readU64LE } from "../bytes.js";
import { ExtensionNotFoundError, InvalidInputError } from "../errors.js";
import type { Address, ConfidentialAccountState } from "../types.js";
import {
  CT_ACCOUNT_LEN,
  CtAccountLayout as L,
  ExtensionType,
  MINT_OFFSET,
} from "./extension.js";
import { findExtension } from "./tlv.js";

const slice = (data: Uint8Array, offset: number, len: number): Uint8Array =>
  data.slice(offset, offset + len);

/**
 * Parse the `ConfidentialTransferAccount` extension out of a Token-2022 account.
 *
 * Pure and key-free: this is the inspector path. Throws
 * {@link ExtensionNotFoundError} if the account has no confidential-transfer
 * extension.
 *
 * @param accountData raw account bytes (as returned by `getAccountInfo`).
 * @param account optional address, echoed back into the result for context.
 */
export function parseConfidentialAccount(
  accountData: Uint8Array,
  account?: Address,
): ConfidentialAccountState {
  if (accountData.length < MINT_OFFSET + 32) {
    throw new InvalidInputError("account data", "too short to contain a mint");
  }
  const mint = bytesToBase58(slice(accountData, MINT_OFFSET, 32));

  const ext = findExtension(accountData, ExtensionType.ConfidentialTransferAccount);
  if (!ext) throw new ExtensionNotFoundError();
  if (ext.length !== CT_ACCOUNT_LEN) {
    throw new InvalidInputError(
      "ConfidentialTransferAccount extension",
      `expected ${CT_ACCOUNT_LEN} bytes, got ${ext.length}`,
    );
  }

  return {
    account,
    mint,
    elgamalPubkey: slice(ext, L.elgamalPubkey, 32),
    approved: ext[L.approved] !== 0,
    allowConfidentialCredits: ext[L.allowConfidentialCredits] !== 0,
    allowNonConfidentialCredits: ext[L.allowNonConfidentialCredits] !== 0,
    pendingBalanceCreditCounter: readU64LE(ext, L.pendingBalanceCreditCounter),
    maximumPendingBalanceCreditCounter: readU64LE(ext, L.maximumPendingBalanceCreditCounter),
    expectedPendingBalanceCreditCounter: readU64LE(ext, L.expectedPendingBalanceCreditCounter),
    actualPendingBalanceCreditCounter: readU64LE(ext, L.actualPendingBalanceCreditCounter),
    ciphertexts: {
      pendingBalanceLo: slice(ext, L.pendingBalanceLo, 64),
      pendingBalanceHi: slice(ext, L.pendingBalanceHi, 64),
      availableBalance: slice(ext, L.availableBalance, 64),
      decryptableAvailableBalance: slice(ext, L.decryptableAvailableBalance, 36),
    },
  };
}
