import { Command } from "commander";
import { ConfidentialKit } from "@confidentialkit/sdk";

/**
 * `confidentialkit inspect <account>` — fetch a confidential-balances account and
 * print its state. Without a key, shows raw ciphertexts (the debugging path);
 * with `--secret-key`, decrypts to human-readable balances. Solves the
 * "raw encrypted bytes" problem from token-2022#145.
 */
export function inspectCommand(): Command {
  return new Command("inspect")
    .description("Inspect a Token-2022 confidential-balances account")
    .argument("<account>", "Base58 token-account address")
    .option("-u, --url <rpc>", "RPC endpoint", "http://127.0.0.1:8899")
    .option("--cluster <cluster>", "localnet | devnet | mainnet-beta", "localnet")
    .option("--secret-key <hex>", "ElGamal secret key (hex) to decrypt balances")
    .option("--json", "Emit JSON instead of a formatted table", false)
    .action(async (account: string, opts) => {
      const kit = new ConfidentialKit({ rpcUrl: opts.url, cluster: opts.cluster });
      const keys = opts.secretKey
        ? { secretKey: hexToBytes(opts.secretKey) }
        : undefined;
      const state = await kit.inspect(account, keys);
      if (opts.json) {
        process.stdout.write(JSON.stringify(state, jsonReplacer, 2) + "\n");
      } else {
        printState(state);
      }
    });
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  return value;
}

function printState(state: unknown): void {
  // Real formatter lands in Week 3 (table of available/pending + raw ciphertexts).
  process.stdout.write(JSON.stringify(state, jsonReplacer, 2) + "\n");
}
