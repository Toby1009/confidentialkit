import {
  AccountRole,
  address,
  type Instruction,
  type AccountMeta,
  type AccountSignerMeta,
  type TransactionSigner,
} from "@solana/kit";
import type { AccountRole as CkRole, InstructionDescriptor } from "@confidentialkit/sdk";

const ROLE_MAP: Record<CkRole, AccountRole> = {
  readonly: AccountRole.READONLY,
  writable: AccountRole.WRITABLE,
  "readonly-signer": AccountRole.READONLY_SIGNER,
  "writable-signer": AccountRole.WRITABLE_SIGNER,
};

const isSignerRole = (role: CkRole): boolean =>
  role === "readonly-signer" || role === "writable-signer";

/**
 * Convert a ConfidentialKit {@link InstructionDescriptor} into an `@solana/kit`
 * instruction. Signer-role accounts get their `TransactionSigner` attached from
 * `signers` (keyed by base58 address) so `signTransactionMessageWithSigners`
 * can find them.
 */
export function toKitInstruction(
  descriptor: InstructionDescriptor,
  signers: Readonly<Record<string, TransactionSigner>> = {},
): Instruction {
  const accounts = descriptor.accounts.map((account): AccountMeta | AccountSignerMeta => {
    const meta: AccountMeta = { address: address(account.address), role: ROLE_MAP[account.role] };
    const signer = signers[account.address];
    if (isSignerRole(account.role) && signer) {
      // `meta.role` is a signer role here (guarded by isSignerRole).
      return { ...meta, signer } as AccountSignerMeta;
    }
    return meta;
  });

  return {
    programAddress: address(descriptor.programAddress),
    accounts,
    data: descriptor.data,
  };
}
