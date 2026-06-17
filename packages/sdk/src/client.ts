import { ConfidentialKitError, InvalidInputError } from "./errors.js";
import { decodeConfidentialAccount, type DecryptKeys } from "./decode.js";
import { fetchAccountData } from "./rpc.js";
import type { Address, DecryptedConfidentialAccount } from "./types.js";

/** Known cluster monikers; `localnet` is the Surfpool mainnet-fork target. */
export type Cluster = "localnet" | "devnet" | "mainnet-beta";

const DEFAULT_RPC_URLS: Record<Cluster, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

export interface ConfidentialKitConfig {
  /** RPC endpoint. Defaults to the cluster's well-known URL. */
  readonly rpcUrl?: string;
  /** Defaults to `localnet` (the Surfpool fork). */
  readonly cluster?: Cluster;
  /** Inject a custom `fetch` (for tests or custom transports). */
  readonly fetch?: typeof fetch;
}

/**
 * Thin client facade: fetch a confidential account from RPC and decode it.
 *
 *   const kit = new ConfidentialKit({ cluster: "localnet" });
 *   const result = await kit.inspect(account, { aeKey });
 *   console.log(result.availableBalance);
 */
export class ConfidentialKit {
  readonly rpcUrl: string;
  readonly cluster: Cluster;
  readonly #fetch: typeof fetch;

  constructor(config: ConfidentialKitConfig = {}) {
    const cluster = config.cluster ?? "localnet";
    if (!Object.hasOwn(DEFAULT_RPC_URLS, cluster)) {
      throw new InvalidInputError(
        "cluster",
        `expected localnet, devnet, or mainnet-beta; got ${String(cluster)}`,
      );
    }
    this.cluster = cluster;
    this.rpcUrl = config.rpcUrl ?? DEFAULT_RPC_URLS[this.cluster];
    this.#fetch = config.fetch ?? fetch;
  }

  /**
   * Fetch and decode a confidential-balances account. With no keys, returns the
   * raw parsed state (inspector mode); with keys, decrypts the balances.
   *
   * @throws ConfidentialKitError if the account does not exist.
   */
  async inspect(account: Address, keys?: DecryptKeys): Promise<DecryptedConfidentialAccount> {
    const data = await fetchAccountData(this.rpcUrl, account, this.#fetch);
    if (!data) {
      throw new ConfidentialKitError(`Account ${account} not found on ${this.cluster}`);
    }
    return decodeConfidentialAccount(data, { account, keys });
  }
}
