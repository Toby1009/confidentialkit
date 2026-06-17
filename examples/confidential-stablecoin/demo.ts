/**
 * Worked example: a confidential stablecoin transfer against a local Surfpool
 * mainnet-fork. Run `pnpm fork:up` in another terminal first.
 *
 * This is the end-to-end "happy path" the SDK is designed to make trivial.
 * The lifecycle calls throw until Week 2 — this file is the target API shape,
 * doubling as living documentation of the intended ergonomics.
 */
import { ConfidentialKit } from "@confidentialkit/sdk";

async function main(): Promise<void> {
  const kit = new ConfidentialKit({
    cluster: "localnet",
    rpcUrl: "http://127.0.0.1:8899",
  });

  // A USD-pegged confidential stablecoin mint cloned onto the fork.
  const mint = "<confidential-stablecoin-mint>";
  const senderAccount = "<sender-token-account>";

  console.log("Inspecting sender confidential balance (raw, no key)...");
  const state = await kit.inspect(senderAccount).catch((e: Error) => {
    console.log(`  (not wired yet) ${e.message}`);
    return undefined;
  });
  if (state) console.log(state);

  // Intended Week-2 API:
  //   await kit lifecycle.configureAccount({ account, mint, auditorPublicKey });
  //   await kit lifecycle.deposit({ account, mint, amount: 1_000_000n });
  //   await kit lifecycle.applyPending({ account, mint });
  //   await kit lifecycle.transfer({
  //     account, mint, amount: 250_000n,
  //     destination, destinationPublicKey, auditorPublicKey,
  //   });
  console.log("\nTarget API documented in this file; lifecycle lands in Week 2.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
