/**
 * Worked example: inspect a confidential stablecoin account against a local
 * Surfpool mainnet-fork. Run `pnpm fork:up` in another terminal first, then:
 *
 *   pnpm --filter @confidentialkit/example-confidential-stablecoin demo
 *
 * This demonstrates the read path (parse + decrypt), which works today even
 * though confidential *transfers* are gated on the ZK ElGamal program being
 * re-enabled on a live cluster.
 */
import {
  ConfidentialKit,
  bytesToHex,
  elgamalSignerMessage,
  type DecryptKeys,
} from "@confidentialkit/sdk";

// Replace with a real confidential token account on your fork.
const ACCOUNT = process.env.CK_ACCOUNT ?? "<sender-token-account>";

async function main(): Promise<void> {
  const kit = new ConfidentialKit({ cluster: "localnet" });

  // In a real app the owner signs `signerMessage` with their wallet and feeds
  // the signature to `deriveElGamalSecretFromSignature` / `deriveAeKeyFromSignature`.
  const accountAddressBytes = new Uint8Array(32); // = bs58.decode(ACCOUNT)
  const message = await elgamalSignerMessage(accountAddressBytes);
  console.log("Owner must sign this message to derive their ElGamal key:");
  console.log(`  ${bytesToHex(message)}\n`);

  // Inspector mode (no keys) — always works, shows raw ciphertexts.
  if (ACCOUNT.startsWith("<")) {
    console.log("Set CK_ACCOUNT to a real account to fetch live state.");
    return;
  }

  const keys: DecryptKeys = {
    // aeKey: <16 bytes derived from the owner's signature>,
    // elgamalSecret: <32 bytes derived from the owner's signature>,
  };
  const result = await kit.inspect(ACCOUNT, keys);
  console.log(`mint:      ${result.state.mint}`);
  console.log(`available: ${result.availableBalance ?? "<supply --ae-key>"}`);
  console.log(`pending:   ${result.pendingBalance ?? "<supply --elgamal-secret>"}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
