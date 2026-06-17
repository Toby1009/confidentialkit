/**
 * On-chain compatibility probe: generate a pubkey-validity proof with the SDK
 * (over @solana/zk-sdk WASM), encode the inline ZK ElGamal `Verify` instruction,
 * and submit it to a running surfpool fork — reporting whether the on-chain ZK
 * program accepts it.
 *
 * This surfaces a real interop concern: the WASM proof system and the on-chain
 * program must share the same Fiat-Shamir transcript version, or proofs that are
 * internally valid (they pass the WASM `verifyProof`) are still rejected on-chain
 * with `SigmaProof(..., AlgebraicRelation)`. See docs/FORK-FINDINGS.md.
 *
 * Prereqs: a surfpool fork on $RPC (pnpm fork:up) + a funded .surfpool-run/payer.json.
 */
import { readFileSync } from "node:fs";
import {
  address,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import * as zk from "@solana/zk-sdk/node";
import {
  encodeVerifyProofInstruction,
  generatePubkeyValidityProof,
  verifyProof,
} from "@confidentialkit/sdk";

const RPC = process.env.RPC ?? "http://127.0.0.1:8899";
const rpc = createSolanaRpc(RPC);
const signer = await createKeyPairSignerFromBytes(
  Uint8Array.from(JSON.parse(readFileSync(".surfpool-run/payer.json", "utf8"))),
);

const keypair = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(9));
const secretKey = keypair.secret();
const secret = secretKey.toBytes();
secretKey.free();
keypair.free();
const { proof } = await generatePubkeyValidityProof(secret);
console.log(`SDK proof generated (${proof.length} B). Offline verifyProof: ${await verifyProof("pubkey-validity", proof)}`);

const ix = encodeVerifyProofInstruction("pubkey-validity", proof);
const instruction = { programAddress: address(ix.programAddress), accounts: [], data: ix.data };
const { value: blockhash } = await rpc.getLatestBlockhash().send();
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(signer, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstruction(instruction, m),
);
const signed = await signTransactionMessageWithSigners(message);
const sim = await rpc
  .simulateTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" })
  .send();

if (!sim.value.err) {
  console.log("✅ On-chain ZK program ACCEPTED the SDK-generated proof — versions are compatible.");
} else {
  const logs = (sim.value.logs ?? []).join("\n");
  console.log("⚠️  On-chain ZK program REJECTED the SDK-generated proof.");
  console.log(logs);
  if (logs.includes("AlgebraicRelation")) {
    console.log(
      "\nThis is a Fiat-Shamir transcript version skew between @solana/zk-sdk (WASM)\n" +
        "and this cluster's ZK ElGamal program. The proof is internally valid (offline\n" +
        "verifyProof passed) but the two versions derive challenges differently.",
    );
  }
}
