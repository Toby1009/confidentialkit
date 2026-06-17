/**
 * Pure inspector logic — no React, no WASM bootstrapping. Everything here is
 * unit-testable in Node; the browser-only WASM setup lives in `main.tsx`.
 */
import {
  base64ToBytes,
  decodeConfidentialAccount,
  hexToBytes,
  type DecryptKeys,
  type DecryptedConfidentialAccount,
} from "@confidentialkit/sdk";

export type Cluster = "localnet" | "devnet" | "mainnet-beta";

const DEFAULT_RPC_URLS: Record<Cluster, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

/** Parse an optional hex key field; empty input means "no key". */
export function parseOptionalHexKey(value: string): Uint8Array | undefined {
  const trimmed = value.trim();
  return trimmed ? hexToBytes(trimmed) : undefined;
}

/** Build the SDK key bundle from the two hex input fields. */
export function buildKeys(aeHex: string, elgamalHex: string): DecryptKeys {
  return {
    aeKey: parseOptionalHexKey(aeHex),
    elgamalSecret: parseOptionalHexKey(elgamalHex),
  };
}

/** Decode account bytes pasted as base64 (works fully offline). */
export function inspectOffline(
  base64: string,
  keys: DecryptKeys,
): Promise<DecryptedConfidentialAccount> {
  return decodeConfidentialAccount(base64ToBytes(base64.trim()), { keys });
}

interface RpcAccountResponse {
  result?: { value: { data: [string, string] } | null };
  error?: { code: number; message: string };
}

/** Fetch and decode an account from an RPC endpoint (browser `fetch`). */
export async function inspectViaRpc(
  account: string,
  cluster: Cluster,
  rpcUrl: string,
  keys: DecryptKeys,
): Promise<DecryptedConfidentialAccount> {
  const url = rpcUrl.trim() || DEFAULT_RPC_URLS[cluster];
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [account.trim(), { encoding: "base64" }],
    }),
  });
  if (!response.ok) throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);

  const body = (await response.json()) as RpcAccountResponse;
  if (body.error) throw new Error(`RPC error ${body.error.code}: ${body.error.message}`);
  if (!body.result || !("value" in body.result)) {
    throw new Error("Unexpected getAccountInfo response: missing result.value");
  }
  const value = body.result.value;
  if (value === null) throw new Error(`Account ${account} not found`);

  const data = value.data;
  if (!Array.isArray(data) || data[1] !== "base64" || typeof data[0] !== "string") {
    throw new Error("Unexpected getAccountInfo response: expected base64-encoded account data");
  }
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(data[0]);
  } catch {
    throw new Error("RPC returned undecodable base64 account data");
  }
  return decodeConfidentialAccount(bytes, { account: account.trim(), keys });
}
