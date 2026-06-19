import {
  base64ToBytes,
  bytesToHex,
  decodeConfidentialAccount,
  hexToBytes,
} from "@confidentialkit/sdk";
import pool from "./transfer-pool.json";

// A pool of REAL confidential transfers that already landed on public devnet
// (agave 4.1.0-rc.1), each sent with the version-matched spl-token-cli 5.6.1
// from the faucet account to a fresh recipient. The transferred amount is hidden
// on-chain; only the recipient's key decrypts it. See docs/FORK-FINDINGS.md.
// These are throwaway test keys, safe to embed.
export interface PoolEntry {
  readonly account: string;
  readonly owner: string;
  readonly amount: number;
  readonly amountBase: string;
  readonly aeKeyHex: string;
  readonly transferTx: string;
  readonly snapshotBase64: string;
}

export const POOL = pool as readonly PoolEntry[];

const explorer = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`;
const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export interface RevealedTransfer {
  readonly account: string;
  readonly accountUrl: string;
  readonly transferTx: string;
  readonly transferTxUrl: string;
  readonly source: "live devnet RPC" | "captured snapshot";
  readonly ciphertextHex: string;
  readonly decryptedTokens: number;
  readonly wrongKeyFailed: boolean;
}

async function fetchAccount(entry: PoolEntry): Promise<{ data: Uint8Array; live: boolean }> {
  try {
    const res = await fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [entry.account, { encoding: "base64" }],
      }),
    });
    const json = await res.json();
    const b64 = json?.result?.value?.data?.[0];
    if (typeof b64 === "string" && b64.length > 0) return { data: base64ToBytes(b64), live: true };
  } catch {
    /* fall through to snapshot */
  }
  return { data: base64ToBytes(entry.snapshotBase64), live: false };
}

/** Decode + decrypt one pool entry with our SDK (the recipient's view). */
export async function revealTransfer(entry: PoolEntry): Promise<RevealedTransfer> {
  const { data, live } = await fetchAccount(entry);
  const aeKey = hexToBytes(entry.aeKeyHex);

  const withKey = await decodeConfidentialAccount(data, { account: entry.account, keys: { aeKey } });
  const wrong = await decodeConfidentialAccount(data, {
    account: entry.account,
    keys: { aeKey: new Uint8Array(16) },
  });

  return {
    account: entry.account,
    accountUrl: explorer(entry.account),
    transferTx: entry.transferTx,
    transferTxUrl: explorerTx(entry.transferTx),
    source: live ? "live devnet RPC" : "captured snapshot",
    ciphertextHex: bytesToHex(withKey.state.ciphertexts.decryptableAvailableBalance),
    decryptedTokens: Number(withKey.availableBalance ?? 0n) / 1e9,
    wrongKeyFailed: wrong.decryptFailed,
  };
}
