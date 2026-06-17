import { readFileSync } from "node:fs";
import {
  bytesToHex,
  decodeBytes,
  type ByteEncoding,
  type DecryptedConfidentialAccount,
} from "@confidentialkit/sdk";

/**
 * Resolve a byte value from either an inline string (`value`) or a file path
 * (`file`). Reading secrets from a file is preferred — inline flags leak into
 * shell history and the process list.
 */
export function resolveBytes(
  what: string,
  value: string | undefined,
  file: string | undefined,
  encoding: ByteEncoding,
): Uint8Array {
  if (file) return decodeBytes(readFileSync(file, "utf8").trim(), encoding);
  if (value) return decodeBytes(value, encoding);
  throw new Error(`missing ${what}: pass a value or --${what}-file`);
}

/** Read raw account bytes from a binary file. */
export function readAccountFile(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

const HEX_PREVIEW = 16;
const previewHex = (bytes: Uint8Array): string =>
  `${bytesToHex(bytes.subarray(0, HEX_PREVIEW))}…(${bytes.length}B)`;

/** Render a decoded confidential account as a human-readable report. */
export function formatAccount(result: DecryptedConfidentialAccount): string {
  const { state } = result;
  const lines = [
    `Confidential account${state.account ? ` ${state.account}` : ""}`,
    `  mint:      ${state.mint}`,
    `  approved:  ${state.approved}`,
    `  credits:   confidential=${state.allowConfidentialCredits} non-confidential=${state.allowNonConfidentialCredits}`,
    `  pending #: ${state.pendingBalanceCreditCounter} / ${state.maximumPendingBalanceCreditCounter}`,
    `  available: ${result.availableBalance ?? "<encrypted — supply --ae-key>"}`,
    `  pending:   ${result.pendingBalance ?? "<encrypted — supply --elgamal-secret>"}`,
  ];
  if (result.decryptFailed) {
    lines.push(`  ⚠ a supplied key failed to decrypt its ciphertext`);
  }
  lines.push(
    `  ciphertexts:`,
    `    elgamalPubkey:  ${previewHex(state.elgamalPubkey)}`,
    `    pendingLo:      ${previewHex(state.ciphertexts.pendingBalanceLo)}`,
    `    pendingHi:      ${previewHex(state.ciphertexts.pendingBalanceHi)}`,
    `    available:      ${previewHex(state.ciphertexts.availableBalance)}`,
    `    decryptableAvl: ${previewHex(state.ciphertexts.decryptableAvailableBalance)}`,
  );
  return lines.join("\n");
}

/** JSON.stringify replacer that renders bigint and Uint8Array sensibly. */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return bytesToHex(value);
  return value;
}
