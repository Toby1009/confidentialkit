/**
 * Lazy, cached access to the `@solana/zk-sdk` WASM module.
 *
 * We never reimplement the cryptography — all ElGamal / AES / proof primitives
 * come from the audited Solana WASM build. This module is the single seam
 * through which the rest of the SDK reaches it, so that:
 *
 *   - the WASM is loaded once and only when first needed (no startup cost for
 *     callers that only parse account state), and
 *   - a browser host can inject the `@solana/zk-sdk/web` (or `/bundler`) build
 *     via {@link setZkModule}, since the default import targets Node.
 */
export type ZkModule = typeof import("@solana/zk-sdk/node");

let pending: Promise<ZkModule> | undefined;
let override: ZkModule | undefined;

/**
 * Supply an already-initialized `@solana/zk-sdk` module. Use this in browser
 * builds, e.g. `setZkModule(await import("@solana/zk-sdk/bundler"))`.
 */
export function setZkModule(mod: ZkModule): void {
  override = mod;
}

/**
 * Resolve the WASM module, loading and caching the Node build on first use.
 * The load promise is cached (not just its result) so concurrent callers share
 * a single import.
 */
export function getZk(): Promise<ZkModule> {
  if (override) return Promise.resolve(override);
  pending ??= import("@solana/zk-sdk/node");
  return pending;
}
