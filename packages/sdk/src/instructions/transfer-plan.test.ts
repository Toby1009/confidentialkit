import { describe, expect, it } from "vitest";
import { buildConfidentialTransferPlan } from "./transfer-plan.js";
import { TOKEN_2022_PROGRAM_ADDRESS } from "./token2022.js";
import { ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS } from "./zk-program.js";
import { SYSTEM_PROGRAM_ADDRESS } from "./system.js";

const params = {
  payer: "Payer1",
  owner: "Owner1",
  sourceTokenAccount: "Src1",
  mint: "Mint1",
  destinationTokenAccount: "Dst1",
  equalityProof: new Uint8Array([1]),
  validityProof: new Uint8Array([2]),
  rangeProof: new Uint8Array([3]),
  equalityContextState: "EqCtx",
  validityContextState: "VaCtx",
  rangeContextState: "RaCtx",
  newSourceDecryptableAvailableBalance: new Uint8Array(36),
  transferAmountAuditorCiphertextLo: new Uint8Array(64),
  transferAmountAuditorCiphertextHi: new Uint8Array(64),
  rentExemptionForSize: (space: number) => BigInt(space) * 7n,
};

describe("buildConfidentialTransferPlan", () => {
  const plan = buildConfidentialTransferPlan(params);

  it("produces the 6-transaction sequence in order", () => {
    expect(plan).toHaveLength(6);
    const prog = (tx: number, ix: number) => plan[tx]![ix]!.programAddress;
    const disc = (tx: number, ix: number) => plan[tx]![ix]!.data[0];

    // 1. create + verify equality
    expect(prog(0, 0)).toBe(SYSTEM_PROGRAM_ADDRESS);
    expect([prog(0, 1), disc(0, 1)]).toEqual([ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS, 3]);
    // 2. create + verify validity
    expect([prog(1, 1), disc(1, 1)]).toEqual([ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS, 12]);
    // 3. create range only
    expect(plan[2]).toHaveLength(1);
    expect(prog(2, 0)).toBe(SYSTEM_PROGRAM_ADDRESS);
    // 4. verify range (u128)
    expect([prog(3, 0), disc(3, 0)]).toEqual([ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS, 7]);
    // 5. transfer
    expect([prog(4, 0), disc(4, 0)]).toEqual([TOKEN_2022_PROGRAM_ADDRESS, 27]);
    // 6. close all three
    expect(plan[5]).toHaveLength(3);
    expect(plan[5]!.every((ix) => ix.data[0] === 0 && ix.programAddress === ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS)).toBe(true);
  });

  it("sizes the context-state accounts and computes rent per size", () => {
    // equality create-account encodes space=161 at bytes[12..20], lamports=161*7 at [4..12]
    const createEquality = plan[0]![0]!;
    const space = Number(readU64LE(createEquality.data, 12));
    const lamports = readU64LE(createEquality.data, 4);
    expect(space).toBe(161);
    expect(lamports).toBe(161n * 7n);
  });
});

function readU64LE(data: Uint8Array, offset: number): bigint {
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(data[offset + i]!);
  return v;
}
