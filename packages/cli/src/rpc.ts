import { ConfidentialKitError, base64ToBytes } from "@confidentialkit/sdk";

/** Known cluster monikers; `localnet` is the Surfpool mainnet-fork target. */
export type Cluster = "localnet" | "devnet" | "mainnet-beta";

const DEFAULT_RPC_URLS: Record<Cluster, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

/** Resolve the RPC URL from an explicit override or the cluster default. */
export function resolveRpcUrl(cluster: Cluster, override?: string): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  if (!Object.hasOwn(DEFAULT_RPC_URLS, cluster)) {
    throw new ConfidentialKitError(`unknown cluster "${String(cluster)}"`);
  }
  return DEFAULT_RPC_URLS[cluster];
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

/**
 * Fetch a single account's raw data via Solana JSON-RPC `getAccountInfo`
 * (base64). Returns `null` if the account does not exist. Lives in the CLI (not
 * the core SDK) so `@confidentialkit/sdk` stays network-free; a CLI talking to an
 * RPC is expected to make network calls.
 */
export async function fetchAccountData(
  rpcUrl: string,
  address: string,
): Promise<Uint8Array | null> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [address, { encoding: "base64" }],
    }),
  });

  if (!response.ok) {
    throw new ConfidentialKitError(`RPC request failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as JsonRpcResponse<{
    value: { data: [string, string] } | null;
  }>;
  if (body.error) {
    throw new ConfidentialKitError(`RPC error ${body.error.code}: ${body.error.message}`);
  }
  // A well-formed getAccountInfo response always carries `result.value` (null for
  // a missing account); a missing `result` is a malformed response, not not-found.
  if (!body.result || !("value" in body.result)) {
    throw new ConfidentialKitError("Unexpected getAccountInfo response: missing result.value");
  }
  const value = body.result.value;
  if (value === null) return null;

  const data = value.data;
  if (!Array.isArray(data) || data[1] !== "base64" || typeof data[0] !== "string") {
    throw new ConfidentialKitError(
      "Unexpected getAccountInfo response: expected base64-encoded account data",
    );
  }
  try {
    return base64ToBytes(data[0]);
  } catch (cause) {
    throw new ConfidentialKitError("RPC returned undecodable base64 account data", { cause });
  }
}
