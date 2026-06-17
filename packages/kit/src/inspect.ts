import { address, type GetAccountInfoApi, type Rpc } from "@solana/kit";
import {
  base64ToBytes,
  decodeConfidentialAccount,
  type DecryptKeys,
  type DecryptedConfidentialAccount,
} from "@confidentialkit/sdk";

export type InspectRpc = Rpc<GetAccountInfoApi>;

/**
 * Fetch a confidential-balances account via `@solana/kit` and decode it. With no
 * keys it returns the raw parsed state (inspector mode); with keys it decrypts
 * the balances. This is the network counterpart to the core SDK's offline
 * `decodeConfidentialAccount` — the SDK itself stays network-free.
 */
export async function inspectConfidentialAccount(
  rpc: InspectRpc,
  account: string,
  keys?: DecryptKeys,
): Promise<DecryptedConfidentialAccount> {
  const { value } = await rpc.getAccountInfo(address(account), { encoding: "base64" }).send();
  if (!value) throw new Error(`Account ${account} not found`);

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
  return decodeConfidentialAccount(bytes, { account, keys });
}
