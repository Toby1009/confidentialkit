/**
 * End-to-end ConfidentialKit pipeline (self-contained — no validator needed):
 *
 *   keys → proof generation → offline verification → recipient/auditor decryption
 *        → transaction-plan construction → (kit submission, version-gated)
 *
 * Run:  pnpm --filter @confidentialkit/example-confidential-stablecoin demo
 */
import * as zk from "@solana/zk-sdk/node";
import {
  buildConfidentialTransferPlan,
  bytesToBase58,
  generateTransferProofs,
  groupedHandleCiphertext,
  verifyProof,
} from "@confidentialkit/sdk";

const randomAddress = () => bytesToBase58(crypto.getRandomValues(new Uint8Array(32)));

async function main(): Promise<void> {
  console.log("=== ConfidentialKit end-to-end pipeline ===\n");

  // 1. Parties' keys (in a real app these are derived from wallet signatures).
  const source = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(1));
  const destination = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(2));
  const auditor = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(3));
  const sourceAe = zk.AeKey.fromSeed(new Uint8Array(16).fill(1));
  console.log("1. Source / destination / auditor ElGamal keys ready");

  // 2. Source's current confidential available balance.
  const currentBalance = 1000n;
  const currentAvailable = source.pubkey().encryptU64(currentBalance).toBytes();
  console.log(`2. Source confidential available balance: ${currentBalance}`);

  // 3. Generate the transfer proofs (transfer 250, with an auditor for compliance).
  const transferAmount = 250n;
  console.log(`3. Generating transfer proofs (amount ${transferAmount}, with auditor)…`);
  const proofs = await generateTransferProofs({
    sourceElgamalSecret: source.secret().toBytes(),
    sourceCurrentAvailableCiphertext: currentAvailable,
    sourceCurrentBalance: currentBalance,
    transferAmount,
    destinationElgamalPubkey: destination.pubkey().toBytes(),
    auditorElgamalPubkey: auditor.pubkey().toBytes(),
  });

  // 4. Verify each proof with the same verifier the on-chain program runs.
  for (const [name, kind, proof] of [
    ["equality", "ciphertext-commitment-equality", proofs.equalityProof.proof],
    ["validity", "batched-grouped-ciphertext-3-handles-validity", proofs.validityProof.proof],
    ["range", "batched-range-u128", proofs.rangeProof.proof],
  ] as const) {
    const ok = await verifyProof(kind, proof);
    console.log(`   ${ok ? "✓" : "✗"} ${name} proof verifies`);
  }

  // 5. Recipient and auditor both recover the transferred amount.
  const recover = (kp: zk.ElGamalKeypair, index: number) => {
    const lo = zk.GroupedElGamalCiphertext3Handles.fromBytes(proofs.transferAmountLo).decrypt(kp.secret(), index);
    const hi = zk.GroupedElGamalCiphertext3Handles.fromBytes(proofs.transferAmountHi).decrypt(kp.secret(), index);
    return lo + (hi << 16n);
  };
  console.log(`4. Recipient decrypts received amount: ${recover(destination, 1)}`);
  console.log(`   Auditor decrypts amount (compliance):  ${recover(auditor, 2)}`);
  console.log(`5. Source's new confidential balance: ${proofs.newSourceBalance}`);

  // 6. Build the on-chain transaction plan.
  const newDecryptable = sourceAe.encrypt(proofs.newSourceBalance).toBytes();
  const plan = buildConfidentialTransferPlan({
    payer: randomAddress(),
    owner: randomAddress(),
    sourceTokenAccount: randomAddress(),
    mint: randomAddress(),
    destinationTokenAccount: randomAddress(),
    equalityProof: proofs.equalityProof.proof,
    validityProof: proofs.validityProof.proof,
    rangeProof: proofs.rangeProof.proof,
    equalityContextState: randomAddress(),
    validityContextState: randomAddress(),
    rangeContextState: randomAddress(),
    newSourceDecryptableAvailableBalance: newDecryptable,
    transferAmountAuditorCiphertextLo: groupedHandleCiphertext(proofs.transferAmountLo, 2),
    transferAmountAuditorCiphertextHi: groupedHandleCiphertext(proofs.transferAmountHi, 2),
    rentExemptionForSize: (space) => BigInt(space) * 7n, // placeholder; real apps fetch via RPC
  });
  const labels = [
    "CreateAccount + VerifyEquality",
    "CreateAccount + VerifyValidity",
    "CreateAccount (range)",
    "VerifyRange",
    "Token2022.Transfer",
    "CloseContextState ×3",
  ];
  console.log("6. On-chain transaction plan:");
  plan.forEach((tx, i) => console.log(`   tx${i + 1} (${tx.length} ix): ${labels[i]}`));
  console.log(`   → ${plan.length} transactions, ${plan.flat().length} instructions total`);

  console.log(
    "\n7. Submit with @confidentialkit/kit `submitConfidentialTransfer(...)`.\n" +
      "   ⚠ Live landing is gated on the @solana/zk-sdk ↔ on-chain ZK ElGamal\n" +
      "     program proof version matching — see docs/FORK-FINDINGS.md.\n" +
      "\n✅ Full construction pipeline ran end-to-end.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
