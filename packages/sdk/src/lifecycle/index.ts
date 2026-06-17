import type { Address, Signature } from "../types.js";

/**
 * The confidential-balances lifecycle, abstracting away the multi-transaction,
 * proof-splitting gauntlet that makes raw Token-2022 confidential transfers hard
 * to use. Each call returns the signature(s) it landed.
 *
 * Real implementations build + send transactions in Week 2. The shapes here are
 * the public contract.
 */
export interface ConfidentialLifecycle {
  /** Configure the confidential-transfer extension on a token account (one-time). */
  configureAccount(params: ConfigureAccountParams): Promise<Signature[]>;
  /** Move tokens from the public balance into the confidential `pending` bucket. */
  deposit(params: AmountParams): Promise<Signature[]>;
  /** Roll `pending` into `available` so the balance becomes spendable. */
  applyPending(params: AccountParams): Promise<Signature[]>;
  /**
   * Confidential transfer: generates ciphertext-validity, equality, and range
   * proofs, uploads them to context-state accounts, and lands the transfer —
   * all proof-splitting handled internally.
   */
  transfer(params: TransferParams): Promise<Signature[]>;
  /** Move tokens from the confidential `available` bucket back to public balance. */
  withdraw(params: AmountParams): Promise<Signature[]>;
}

export interface AccountParams {
  readonly account: Address;
  readonly mint: Address;
}

export interface ConfigureAccountParams extends AccountParams {
  /** Optional auditor public key — enables selective disclosure / compliance. */
  readonly auditorPublicKey?: Uint8Array;
}

export interface AmountParams extends AccountParams {
  readonly amount: bigint;
}

export interface TransferParams extends AmountParams {
  readonly destination: Address;
  readonly destinationPublicKey: Uint8Array;
  readonly auditorPublicKey?: Uint8Array;
}
