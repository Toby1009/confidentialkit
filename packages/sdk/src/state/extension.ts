/**
 * Constants for the SPL Token-2022 account + extension byte layout.
 *
 * References: spl-token-2022 `state::Account` (165-byte base), the `AccountType`
 * discriminator byte, and the TLV-encoded extensions that follow it.
 */

/** Length of the base SPL Token account, before any extensions. */
export const BASE_ACCOUNT_LEN = 165;

/** Offset of the mint (Pubkey) within the base account. */
export const MINT_OFFSET = 0;

/** Offset of the `AccountType` discriminator byte (present only with extensions). */
export const ACCOUNT_TYPE_OFFSET = BASE_ACCOUNT_LEN;

/** Offset at which the TLV-encoded extension list begins. */
export const TLV_START = BASE_ACCOUNT_LEN + 1;

/** SPL Token-2022 `AccountType` discriminator values. */
export const AccountType = {
  Uninitialized: 0,
  Mint: 1,
  Account: 2,
} as const;

/**
 * SPL Token-2022 `ExtensionType` values (subset). The full enum is large and
 * stable; we only need the discriminators the parser walks past or targets.
 */
export const ExtensionType = {
  Uninitialized: 0,
  ConfidentialTransferAccount: 5,
} as const;

/**
 * Field offsets within the 295-byte `ConfidentialTransferAccount` extension
 * payload (i.e. relative to the start of the extension's TLV data, not the
 * account).
 */
export const CT_ACCOUNT_LEN = 295;
export const CtAccountLayout = {
  approved: 0, // 1 byte
  elgamalPubkey: 1, // 32
  pendingBalanceLo: 33, // 64
  pendingBalanceHi: 97, // 64
  availableBalance: 161, // 64
  decryptableAvailableBalance: 225, // 36
  allowConfidentialCredits: 261, // 1
  allowNonConfidentialCredits: 262, // 1
  pendingBalanceCreditCounter: 263, // 8
  maximumPendingBalanceCreditCounter: 271, // 8
  expectedPendingBalanceCreditCounter: 279, // 8
  actualPendingBalanceCreditCounter: 287, // 8
} as const;
