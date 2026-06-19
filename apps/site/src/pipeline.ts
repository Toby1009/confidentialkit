import * as zk from "@solana/zk-sdk/bundler";
import {
  buildConfidentialTransferPlan,
  bytesToBase58,
  bytesToHex,
  decryptAeCiphertext,
  generateTransferProofs,
  groupedHandleCiphertext,
  verifyProof,
} from "@confidentialkit/sdk";

export interface EncryptedBalance {
  readonly amount: bigint;
  /** The on-chain confidential-balance ciphertext (AES decryptable-available-balance). */
  readonly ciphertext: Uint8Array;
  readonly ciphertextHex: string;
  readonly ownerKey: Uint8Array;
  readonly wrongKey: Uint8Array;
}

/** Encrypt an amount into a Token-2022 confidential-balance ciphertext (client-side). */
export function encryptBalance(amount: bigint): EncryptedBalance {
  const owner = zk.AeKey.fromSeed(crypto.getRandomValues(new Uint8Array(16)));
  const wrong = zk.AeKey.fromSeed(crypto.getRandomValues(new Uint8Array(16)));
  const ciphertext = owner.encrypt(amount).toBytes();
  const result: EncryptedBalance = {
    amount,
    ciphertext,
    ciphertextHex: bytesToHex(ciphertext),
    ownerKey: owner.toBytes(),
    wrongKey: wrong.toBytes(),
  };
  owner.free();
  wrong.free();
  return result;
}

/** Decrypt the ciphertext; returns `null` when the wrong key is used. */
export async function decryptBalance(
  enc: EncryptedBalance,
  useWrongKey: boolean,
): Promise<bigint | null> {
  try {
    return await decryptAeCiphertext(enc.ciphertext, useWrongKey ? enc.wrongKey : enc.ownerKey);
  } catch {
    return null; // wrong key → DecryptionError
  }
}

export interface DemoStep {
  readonly label: string;
  readonly detail: string;
  readonly ok: boolean;
}

export interface PlanRow {
  readonly label: string;
  readonly ixCount: number;
}

export interface DemoResult {
  readonly steps: DemoStep[];
  readonly plan: PlanRow[];
  readonly newSourceBalance: string;
  readonly recipientAmount: string;
  readonly auditorAmount: string;
}

const randomAddress = () => bytesToBase58(crypto.getRandomValues(new Uint8Array(32)));

/**
 * Run the entire confidential-transfer construction pipeline in the browser —
 * keys → proof generation → verification → recipient/auditor decryption →
 * transaction-plan build. Everything is client-side; no backend, no network.
 */
export async function runDemo(currentBalance: bigint, transferAmount: bigint): Promise<DemoResult> {
  const steps: DemoStep[] = [];
  const add = (label: string, detail: string, ok = true) => steps.push({ label, detail, ok });

  const source = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(1));
  const destination = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(2));
  const auditor = zk.ElGamalKeypair.fromSeed(new Uint8Array(32).fill(3));
  const sourceAe = zk.AeKey.fromSeed(new Uint8Array(16).fill(1));
  add("Keys ready", "source / destination / auditor ElGamal keys + source AES key");

  const currentAvailable = source.pubkey().encryptU64(currentBalance).toBytes();
  add("Source balance encrypted", `available = ${currentBalance} (twisted-ElGamal ciphertext)`);

  const proofs = await generateTransferProofs({
    sourceElgamalSecret: source.secret().toBytes(),
    sourceCurrentAvailableCiphertext: currentAvailable,
    sourceCurrentBalance: currentBalance,
    transferAmount,
    destinationElgamalPubkey: destination.pubkey().toBytes(),
    auditorElgamalPubkey: auditor.pubkey().toBytes(),
  });
  add("ZK proofs generated", `equality + ciphertext-validity + range, for amount ${transferAmount}`);

  for (const [name, kind, proof] of [
    ["equality", "ciphertext-commitment-equality", proofs.equalityProof.proof],
    ["ciphertext-validity", "batched-grouped-ciphertext-3-handles-validity", proofs.validityProof.proof],
    ["range", "batched-range-u128", proofs.rangeProof.proof],
  ] as const) {
    const ok = await verifyProof(kind, proof);
    add(`Verify ${name} proof`, ok ? "accepted by the WASM verifier (the same logic the chain runs)" : "FAILED", ok);
  }

  const recover = (kp: typeof source, index: number): bigint => {
    const lo = zk.GroupedElGamalCiphertext3Handles.fromBytes(proofs.transferAmountLo).decrypt(kp.secret(), index);
    const hi = zk.GroupedElGamalCiphertext3Handles.fromBytes(proofs.transferAmountHi).decrypt(kp.secret(), index);
    return lo + (hi << 16n);
  };
  const recipientAmount = recover(destination, 1);
  const auditorAmount = recover(auditor, 2);
  add("Recipient decrypts amount", `${recipientAmount} (recipient's key only)`, recipientAmount === transferAmount);
  add("Auditor decrypts amount", `${auditorAmount} (compliance / selective disclosure)`, auditorAmount === transferAmount);

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
    rentExemptionForSize: (space) => BigInt(space) * 7n,
  });
  const labels = [
    "CreateAccount + VerifyEquality",
    "CreateAccount + VerifyValidity",
    "CreateAccount (range)",
    "VerifyRange",
    "Token2022.Transfer",
    "CloseContextState ×3",
  ];
  add("Transaction plan built", `${plan.length} transactions, ${plan.flat().length} instructions`);

  source.free();
  destination.free();
  auditor.free();

  return {
    steps,
    plan: plan.map((tx, i) => ({ label: labels[i] ?? `tx ${i + 1}`, ixCount: tx.length })),
    newSourceBalance: proofs.newSourceBalance.toString(),
    recipientAmount: recipientAmount.toString(),
    auditorAmount: auditorAmount.toString(),
  };
}
