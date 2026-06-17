import type { Address, ConfidentialBalanceState } from "./types.js";
import { createUnimplementedProver, type Prover } from "./proofs/index.js";
import {
  createUnimplementedElGamalProvider,
  type ElGamalProvider,
} from "./crypto/elgamal.js";

/** Known cluster monikers; `localnet` is the Surfpool mainnet-fork target. */
export type Cluster = "localnet" | "devnet" | "mainnet-beta";

export interface ConfidentialKitConfig {
  /** RPC endpoint. Defaults to a local Surfpool fork on 8899. */
  readonly rpcUrl?: string;
  readonly cluster?: Cluster;
  /** Override the proof backend (e.g. inject the WASM prover). */
  readonly prover?: Prover;
  /** Override the ElGamal crypto backend. */
  readonly elgamal?: ElGamalProvider;
}

/**
 * Top-level entry point. Construct once, then drive the lifecycle or inspect
 * confidential account state.
 *
 *   const kit = new ConfidentialKit({ cluster: "localnet" });
 *   const state = await kit.inspect(account, { secretKey });
 */
export class ConfidentialKit {
  readonly rpcUrl: string;
  readonly cluster: Cluster;
  readonly prover: Prover;
  readonly elgamal: ElGamalProvider;

  constructor(config: ConfidentialKitConfig = {}) {
    this.cluster = config.cluster ?? "localnet";
    this.rpcUrl = config.rpcUrl ?? "http://127.0.0.1:8899";
    this.prover = config.prover ?? createUnimplementedProver();
    this.elgamal = config.elgamal ?? createUnimplementedElGamalProvider();
  }

  /**
   * Fetch and (optionally) decrypt a confidential-balances account. With no key,
   * returns raw ciphertexts only — this is the inspector / debugging path.
   *
   * Implemented in Week 2/3; wired to RPC + the ElGamal provider.
   */
  async inspect(
    _account: Address,
    _keys?: { secretKey?: Uint8Array; aeKey?: Uint8Array },
  ): Promise<ConfidentialBalanceState> {
    throw new Error("ConfidentialKit.inspect() not implemented yet (Week 2/3).");
  }
}
