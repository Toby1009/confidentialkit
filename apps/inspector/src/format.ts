/** Pure view-model formatting for a decoded confidential account. */
import { bytesToHex, type DecryptedConfidentialAccount } from "@confidentialkit/sdk";

export interface Field {
  readonly label: string;
  readonly value: string;
}

export interface CipherRow {
  readonly label: string;
  readonly hex: string;
}

export interface Report {
  readonly fields: Field[];
  readonly ciphertexts: CipherRow[];
  readonly warning?: string;
}

const PREVIEW = 16;
const preview = (b: Uint8Array): string => `${bytesToHex(b.subarray(0, PREVIEW))}…(${b.length}B)`;

const balance = (value: bigint | undefined, hint: string): string =>
  value === undefined ? `🔒 ${hint}` : value.toString();

/** Build the renderable report from a decode result. */
export function toReport(result: DecryptedConfidentialAccount): Report {
  const { state } = result;
  const { ciphertexts } = state;

  return {
    fields: [
      { label: "Account", value: state.account ?? "—" },
      { label: "Mint", value: state.mint },
      { label: "Approved", value: String(state.approved) },
      { label: "Available balance", value: balance(result.availableBalance, "supply AES key") },
      { label: "Pending balance", value: balance(result.pendingBalance, "supply ElGamal secret") },
      {
        label: "Pending credits",
        value: `${state.pendingBalanceCreditCounter} / ${state.maximumPendingBalanceCreditCounter}`,
      },
      {
        label: "Allows credits",
        value: `confidential=${state.allowConfidentialCredits}, non-confidential=${state.allowNonConfidentialCredits}`,
      },
    ],
    ciphertexts: [
      { label: "ElGamal pubkey", hex: preview(state.elgamalPubkey) },
      { label: "Pending (lo)", hex: preview(ciphertexts.pendingBalanceLo) },
      { label: "Pending (hi)", hex: preview(ciphertexts.pendingBalanceHi) },
      { label: "Available (ElGamal)", hex: preview(ciphertexts.availableBalance) },
      { label: "Available (AES)", hex: preview(ciphertexts.decryptableAvailableBalance) },
    ],
    warning: result.decryptFailed ? "A supplied key failed to decrypt its ciphertext." : undefined,
  };
}
