import {
  base64ToBytes,
  bytesToHex,
  decodeConfidentialAccount,
  hexToBytes,
} from "@confidentialkit/sdk";

// A real, non-zero Token-2022 confidential account provisioned LIVE on public
// devnet (agave 4.1.0-rc.1) with the version-matched spl-token-cli 5.6.1.
// See docs/FORK-FINDINGS.md. These are throwaway test keys, safe to embed.
export const DEVNET_ACCOUNT = "736aw6bF5qp8NzANrckEiPJZ36Ci1jKkPrQJvm5vW3Jo";
export const DEVNET_MINT = "HfgBdtQ9u3FGDEFaxf9KS2hcCwR5pLBfh6y1dwTSWB4q";
export const DEVNET_EXPLORER = `https://explorer.solana.com/address/${DEVNET_ACCOUNT}?cluster=devnet`;
const DEVNET_AE_KEY_HEX = "886bc73cf4ee9ceafe3c4af18ec9dad1"; // owner key (HKDF-derived)

// Snapshot captured from devnet RPC — used as a fallback if the live fetch is
// rate-limited or blocked, so the demo always works.
const SNAPSHOT_BASE64 =
  "96NdyWIcHdgDC2erXDYTKZ4w14HdoYwzZem2NdQrQx53l9GoTFgLItyThpqJPfDVH5nQVknZFMFh+/3UsdVLpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgcAAAAFACcBAezwchWbdt5tCHJNkwLy00OKkPAdZMAm1/LDtWwsmPkuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuYGnglLfIqmyRsmKXLwAcaJzwGlKUGaQe2nXS5YuzdIStVigOM0X5chx+cMNgbsTqbruzlXO+1Yc0N0IfqL4Dr+RrDWtUgGIsu6tpcoq3U5yMSSl37uVcbhriYcUFea/C/DWXAQEAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAABAAAAAAAAAA==";

export interface LiveAccount {
  readonly source: "live devnet RPC" | "captured snapshot";
  readonly mint: string;
  readonly approved: boolean;
  readonly ciphertextHex: string;
  readonly balanceWithOwnerKey: bigint;
  readonly wrongKeyFailed: boolean;
}

async function fetchAccountData(): Promise<{ data: Uint8Array; live: boolean }> {
  try {
    const res = await fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [DEVNET_ACCOUNT, { encoding: "base64" }],
      }),
    });
    const json = await res.json();
    const b64 = json?.result?.value?.data?.[0];
    if (typeof b64 === "string" && b64.length > 0) {
      return { data: base64ToBytes(b64), live: true };
    }
  } catch {
    /* fall through to snapshot */
  }
  return { data: base64ToBytes(SNAPSHOT_BASE64), live: false };
}

/** Fetch the real devnet account and decrypt its balance with our SDK. */
export async function loadDevnetAccount(): Promise<LiveAccount> {
  const { data, live } = await fetchAccountData();
  const ownerKey = hexToBytes(DEVNET_AE_KEY_HEX);

  const withOwner = await decodeConfidentialAccount(data, {
    account: DEVNET_ACCOUNT,
    keys: { aeKey: ownerKey },
  });
  const wrong = await decodeConfidentialAccount(data, {
    account: DEVNET_ACCOUNT,
    keys: { aeKey: new Uint8Array(16) },
  });

  return {
    source: live ? "live devnet RPC" : "captured snapshot",
    mint: withOwner.state.mint,
    approved: withOwner.state.approved,
    ciphertextHex: bytesToHex(withOwner.state.ciphertexts.decryptableAvailableBalance),
    balanceWithOwnerKey: withOwner.availableBalance ?? 0n,
    wrongKeyFailed: wrong.decryptFailed,
  };
}
