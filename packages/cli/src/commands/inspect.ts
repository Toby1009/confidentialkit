import { Command } from "commander";
import {
  ConfidentialKit,
  base64ToBytes,
  decodeConfidentialAccount,
  type Cluster,
} from "@confidentialkit/sdk";
import { formatAccount, jsonReplacer, readAccountFile, resolveBytes } from "../util.js";

interface InspectOptions {
  url?: string;
  cluster: Cluster;
  aeKey?: string;
  aeKeyFile?: string;
  elgamalSecret?: string;
  elgamalSecretFile?: string;
  accountData?: string;
  accountFile?: string;
  json: boolean;
}

/**
 * `confidentialkit inspect <account>` — fetch (or load) a confidential-balances
 * account and print its state. Without keys it shows raw ciphertexts (the
 * debugging path for token-2022#145); with keys it decrypts the balances.
 */
export function inspectCommand(): Command {
  return new Command("inspect")
    .description("Inspect a Token-2022 confidential-balances account")
    .argument("[account]", "Base58 token-account address (omit when using --account-*)")
    .option("-u, --url <rpc>", "RPC endpoint (overrides --cluster default)")
    .option("--cluster <cluster>", "localnet | devnet | mainnet-beta", "localnet")
    .option("--ae-key <hex>", "AES key (hex) to decrypt the available balance")
    .option("--ae-key-file <path>", "read the AES key (hex) from a file")
    .option("--elgamal-secret <hex>", "ElGamal secret key (hex) to decrypt the pending balance")
    .option("--elgamal-secret-file <path>", "read the ElGamal secret (hex) from a file")
    .option("--account-data <base64>", "decode inline account data instead of fetching (offline)")
    .option("--account-file <path>", "read raw account bytes from a binary file (offline)")
    .option("--json", "emit JSON instead of a formatted report", false)
    .action(async (account: string | undefined, opts: InspectOptions) => {
      const keys = {
        aeKey: opts.aeKey || opts.aeKeyFile
          ? resolveBytes("ae-key", opts.aeKey, opts.aeKeyFile, "hex")
          : undefined,
        elgamalSecret: opts.elgamalSecret || opts.elgamalSecretFile
          ? resolveBytes("elgamal-secret", opts.elgamalSecret, opts.elgamalSecretFile, "hex")
          : undefined,
      };

      const offlineData = opts.accountData
        ? base64ToBytes(opts.accountData)
        : opts.accountFile
          ? readAccountFile(opts.accountFile)
          : undefined;

      const result = offlineData
        ? await decodeConfidentialAccount(offlineData, { account, keys })
        : await inspectViaRpc(account, opts, keys);

      process.stdout.write(
        (opts.json ? JSON.stringify(result, jsonReplacer, 2) : formatAccount(result)) + "\n",
      );
    });
}

async function inspectViaRpc(
  account: string | undefined,
  opts: InspectOptions,
  keys: { aeKey?: Uint8Array; elgamalSecret?: Uint8Array },
) {
  if (!account) {
    throw new Error("an <account> address is required unless --account-data/--account-file is given");
  }
  const kit = new ConfidentialKit({ cluster: opts.cluster, rpcUrl: opts.url });
  return kit.inspect(account, keys);
}
