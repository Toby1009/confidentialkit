import { base64ToBytes } from "./bytes.js";
import { ConfidentialKitError } from "./errors.js";
import type { Address } from "./types.js";

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

interface AccountInfoValue {
  data: [string, string]; // [base64-data, "base64"]
  owner: string;
  lamports: number;
}

/**
 * Fetch a single account's raw data via the Solana JSON-RPC `getAccountInfo`
 * method (base64 encoding). Returns `null` if the account does not exist.
 *
 * Intentionally dependency-free (uses global `fetch`) so the SDK stays light and
 * works against any RPC, including a local Surfpool fork.
 */
export async function fetchAccountData(
  rpcUrl: string,
  address: Address,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array | null> {
  const response = await fetchImpl(rpcUrl, {
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
    throw new ConfidentialKitError(
      `RPC request failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as JsonRpcResponse<{ value: AccountInfoValue | null }>;
  if (body.error) {
    throw new ConfidentialKitError(`RPC error ${body.error.code}: ${body.error.message}`);
  }
  const value = body.result?.value;
  if (!value) return null;

  return base64ToBytes(value.data[0]);
}
