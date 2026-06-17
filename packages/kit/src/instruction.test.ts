import { describe, expect, it } from "vitest";
import { AccountRole, address, createNoopSigner } from "@solana/kit";
import type { InstructionDescriptor } from "@confidentialkit/sdk";
import { toKitInstruction } from "./instruction.js";

const PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const WRITABLE = "So11111111111111111111111111111111111111112";
const OWNER = "HN7yPSafA7aVEp28vNREtmXRemtg4XAeWvH2N85XYYU5";
const CTX = "ZkE1Gama1Proof11111111111111111111111111111";

const descriptor: InstructionDescriptor = {
  programAddress: PROGRAM,
  accounts: [
    { address: WRITABLE, role: "writable" },
    { address: CTX, role: "readonly" },
    { address: OWNER, role: "readonly-signer" },
  ],
  data: new Uint8Array([1, 2, 3]),
};

describe("toKitInstruction", () => {
  it("maps program, data, and account roles", () => {
    const ix = toKitInstruction(descriptor);
    expect(ix.programAddress).toBe(address(PROGRAM));
    expect(ix.data).toEqual(new Uint8Array([1, 2, 3]));
    expect((ix.accounts ?? []).map((a: { readonly role: AccountRole }) => a.role)).toEqual([
      AccountRole.WRITABLE,
      AccountRole.READONLY,
      AccountRole.READONLY_SIGNER,
    ]);
  });

  it("attaches a TransactionSigner to signer-role accounts when provided", () => {
    const ownerSigner = createNoopSigner(address(OWNER));
    const ix = toKitInstruction(descriptor, { [OWNER]: ownerSigner });
    const ownerMeta = ix.accounts![2]!;
    expect("signer" in ownerMeta && ownerMeta.signer).toBe(ownerSigner);
  });

  it("does not attach a signer to a non-signer account even if one is supplied", () => {
    const writableSigner = createNoopSigner(address(WRITABLE));
    const ix = toKitInstruction(descriptor, { [WRITABLE]: writableSigner });
    expect("signer" in ix.accounts![0]!).toBe(false);
  });
});
