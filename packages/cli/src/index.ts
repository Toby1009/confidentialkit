import { Command } from "commander";
import { inspectCommand } from "./commands/inspect.js";
import { decryptCommand } from "./commands/decrypt.js";

const program = new Command();

program
  .name("confidentialkit")
  .description(
    "Developer toolkit for Solana Token-2022 Confidential Balances — inspect and decrypt confidential account state.",
  )
  .version("0.0.1");

program.addCommand(inspectCommand());
program.addCommand(decryptCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
});
