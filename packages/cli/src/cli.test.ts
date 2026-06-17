import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import * as zk from "@solana/zk-sdk/node";

const run = promisify(execFile);
const ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));

/** Run the CLI through tsx so the test does not depend on a prior build. */
function cli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return run("node", ["--import", "tsx", ENTRY, ...args]);
}

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

describe("confidentialkit CLI", () => {
  it("prints help", async () => {
    const { stdout } = await cli(["--help"]);
    expect(stdout).toContain("inspect");
    expect(stdout).toContain("decrypt");
  });

  it("decrypts an AES ciphertext end-to-end", async () => {
    const key = zk.AeKey.fromSeed(new Uint8Array(16).fill(3));
    const ct = key.encrypt(777n);
    const { stdout } = await cli([
      "decrypt",
      hex(ct.toBytes()),
      "--type",
      "ae",
      "--key",
      hex(key.toBytes()),
    ]);
    expect(stdout.trim()).toBe("777");
    key.free();
    ct.free();
  });

  it("decrypts an ElGamal ciphertext end-to-end", async () => {
    const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(4));
    const ct = kp.pubkey().encryptU64(55n);
    const { stdout } = await cli([
      "decrypt",
      hex(ct.toBytes()),
      "--key",
      hex(kp.secret().toBytes()),
    ]);
    expect(stdout.trim()).toBe("55");
    kp.free();
    ct.free();
  });

  it("exits non-zero on a wrong key", async () => {
    const kp = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(5));
    const wrong = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(6));
    const ct = kp.pubkey().encryptU64(9n);
    await expect(
      cli(["decrypt", hex(ct.toBytes()), "--key", hex(wrong.secret().toBytes())]),
    ).rejects.toMatchObject({ code: 1 });
    kp.free();
    wrong.free();
    ct.free();
  });
});
