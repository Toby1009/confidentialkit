import { Command } from "commander";
import {
  decodeBytes,
  decryptAeCiphertext,
  decryptElGamalCiphertext,
  type ByteEncoding,
} from "@confidentialkit/sdk";
import { resolveBytes } from "../util.js";

interface DecryptOptions {
  type: "elgamal" | "ae";
  key?: string;
  keyFile?: string;
  encoding: ByteEncoding;
}

/**
 * `confidentialkit decrypt <ciphertext>` — decode a single confidential-balance
 * ciphertext to a `u64` amount. This is the focused primitive behind
 * token-2022#145 (the missing `spl-token --decrypt`).
 */
export function decryptCommand(): Command {
  return new Command("decrypt")
    .description("Decrypt a single confidential-balance ciphertext to an amount")
    .argument("<ciphertext>", "Ciphertext bytes (ElGamal=64B, AE=36B)")
    .option("-t, --type <type>", "ciphertext type: elgamal | ae", "elgamal")
    .option("--key <hex>", "decryption key (hex): ElGamal secret (32B) or AES key (16B)")
    .option("--key-file <path>", "read the key (hex) from a file (preferred — avoids shell history)")
    .option("-e, --encoding <enc>", "ciphertext encoding: hex | base64 | base58", "hex")
    .action(async (ciphertext: string, opts: DecryptOptions) => {
      if (opts.type !== "elgamal" && opts.type !== "ae") {
        throw new Error(`unknown --type "${opts.type}" (expected elgamal | ae)`);
      }
      const ct = decodeBytes(ciphertext, opts.encoding);
      const key = resolveBytes("key", opts.key, opts.keyFile, "hex");

      const amount =
        opts.type === "elgamal"
          ? await decryptElGamalCiphertext(ct, key)
          : await decryptAeCiphertext(ct, key);

      process.stdout.write(`${amount}\n`);
    });
}
