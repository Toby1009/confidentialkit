/**
 * Pure inspector logic — no React, no WASM bootstrapping. Everything here is
 * unit-testable in Node; the browser-only WASM setup lives in `main.tsx`.
 */
import {
  ConfidentialKit,
  base64ToBytes,
  decodeConfidentialAccount,
  hexToBytes,
  type Cluster,
  type DecryptKeys,
  type DecryptedConfidentialAccount,
} from "@confidentialkit/sdk";

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

/** Fetch and decode an account from an RPC endpoint. */
export function inspectViaRpc(
  account: string,
  cluster: Cluster,
  rpcUrl: string,
  keys: DecryptKeys,
): Promise<DecryptedConfidentialAccount> {
  const kit = new ConfidentialKit({ cluster, rpcUrl: rpcUrl.trim() || undefined });
  return kit.inspect(account.trim(), keys);
}
