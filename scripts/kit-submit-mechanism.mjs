/**
 * Validate the @confidentialkit/kit submission mechanism end-to-end against a
 * running surfpool fork: build a 2-transaction plan with `encodeCreateAccountInstruction`
 * and land it via `sendInstructionPlan` (exercises the InstructionDescriptor →
 * kit adapter, ephemeral signer attachment, and the sign/send/confirm loop).
 *
 * This is the same machinery `submitConfidentialTransfer` uses; the confidential
 * transfer's proof steps are additionally gated on the @solana/zk-sdk ↔ on-chain
 * ZK program version match (see docs/FORK-FINDINGS.md), but the submission
 * plumbing is proven here without proofs.
 *
 * Prereqs: a surfpool fork on $RPC (pnpm fork:up) + a funded .surfpool-run/payer.json.
 */
import { readFileSync } from "node:fs";
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
} from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS, encodeCreateAccountInstruction } from "@confidentialkit/sdk";
import { sendInstructionPlan } from "@confidentialkit/kit";

const RPC = process.env.RPC ?? "http://127.0.0.1:8899";
const WS = process.env.WS ?? "ws://127.0.0.1:8900";

const rpc = createSolanaRpc(RPC);
const rpcSubscriptions = createSolanaRpcSubscriptions(WS);
const payer = await createKeyPairSignerFromBytes(
  Uint8Array.from(JSON.parse(readFileSync(".surfpool-run/payer.json", "utf8"))),
);

const [a1, a2] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
const rent = await rpc.getMinimumBalanceForRentExemption(0n).send();
const create = (newAccount) =>
  encodeCreateAccountInstruction({
    payer: payer.address,
    newAccount: newAccount.address,
    lamports: rent,
    space: 0,
    owner: SYSTEM_PROGRAM_ADDRESS,
  });

console.log("Submitting a 2-transaction plan via @confidentialkit/kit ...");
const signatures = await sendInstructionPlan({
  rpc,
  rpcSubscriptions,
  feePayer: payer,
  signers: { [payer.address]: payer, [a1.address]: a1, [a2.address]: a2 },
  plan: [[create(a1)], [create(a2)]],
});
console.log(`Landed ${signatures.length} transactions.`);

const [info1, info2] = await Promise.all([
  rpc.getAccountInfo(a1.address).send(),
  rpc.getAccountInfo(a2.address).send(),
]);
const ok = signatures.length === 2 && info1.value !== null && info2.value !== null;
console.log(
  ok
    ? "✅ kit submission mechanism works — both accounts created + confirmed on-chain."
    : "❌ submission incomplete (missing signatures or accounts)",
);
process.exit(ok ? 0 : 1);
