import { Command } from "commander";

/**
 * `confidentialkit decrypt <ciphertext>` — decode a single ElGamal/AES ciphertext
 * blob to a u64 amount, given a key. This is the focused primitive behind
 * token-2022#145 (the missing `spl-token --decrypt`).
 *
 * Implementation wires the SDK ElGamal provider in Week 3.
 */
export function decryptCommand(): Command {
  return new Command("decrypt")
    .description("Decrypt a single confidential-balance ciphertext to an amount")
    .argument("<ciphertext>", "Ciphertext bytes (hex or base64)")
    .requiredOption("--secret-key <hex>", "ElGamal secret key (hex)")
    .option("--encoding <enc>", "Input encoding: hex | base64", "hex")
    .option("--ae", "Treat input as an AES decryptable-available-balance blob", false)
    .action(async (_ciphertext: string, _opts) => {
      throw new Error(
        "decrypt: not implemented yet (Week 3). Wires @solana/zk-sdk decryption.",
      );
    });
}
