import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Commitment,
  type GetEpochInfoApi,
  type GetLatestBlockhashApi,
  type GetMinimumBalanceForRentExemptionApi,
  type GetSignatureStatusesApi,
  type Rpc,
  type RpcSubscriptions,
  type SendTransactionApi,
  type Signature,
  type SignatureNotificationsApi,
  type SlotNotificationsApi,
  type TransactionSigner,
} from "@solana/kit";
import {
  CONTEXT_STATE_ACCOUNT_SIZE,
  buildConfidentialTransferPlan,
  groupedHandleCiphertext,
  type InstructionDescriptor,
  type TransferProofs,
} from "@confidentialkit/sdk";
import { toKitInstruction } from "./instruction.js";

export type SubmitRpc = Rpc<
  GetLatestBlockhashApi &
    SendTransactionApi &
    GetSignatureStatusesApi &
    GetEpochInfoApi &
    GetMinimumBalanceForRentExemptionApi
>;
export type SubmitRpcSubscriptions = RpcSubscriptions<
  SignatureNotificationsApi & SlotNotificationsApi
>;

export interface SendInstructionPlanParams {
  readonly rpc: SubmitRpc;
  readonly rpcSubscriptions: SubmitRpcSubscriptions;
  /** Fee payer (and a default signer). */
  readonly feePayer: TransactionSigner;
  /** Ordered transactions; each inner array is one transaction's instructions. */
  readonly plan: readonly (readonly InstructionDescriptor[])[];
  /** Signers for signer-role accounts, keyed by base58 address. */
  readonly signers?: Readonly<Record<string, TransactionSigner>>;
  readonly commitment?: Commitment;
}

/**
 * Sign and send an ordered instruction plan one transaction at a time, awaiting
 * confirmation between transactions (later transactions depend on accounts the
 * earlier ones create). Returns the landed signatures in order.
 */
export async function sendInstructionPlan(
  params: SendInstructionPlanParams,
): Promise<Signature[]> {
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: params.rpc,
    rpcSubscriptions: params.rpcSubscriptions,
  });
  const signers = params.signers ?? {};
  const signatures: Signature[] = [];

  for (const instructions of params.plan) {
    const { value: latestBlockhash } = await params.rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(params.feePayer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) =>
        appendTransactionMessageInstructions(
          instructions.map((d) => toKitInstruction(d, signers)),
          m,
        ),
    );
    const signed = await signTransactionMessageWithSigners(message);
    assertIsTransactionWithinSizeLimit(signed);
    await sendAndConfirm(signed, { commitment: params.commitment ?? "confirmed" });
    signatures.push(getSignatureFromTransaction(signed));
  }
  return signatures;
}

export interface SubmitConfidentialTransferParams {
  readonly rpc: SubmitRpc;
  readonly rpcSubscriptions: SubmitRpcSubscriptions;
  /** Fee payer (also funds the context-state accounts). */
  readonly feePayer: TransactionSigner;
  /** Source account owner (signs the transfer + context-state closes). */
  readonly owner: TransactionSigner;
  readonly sourceTokenAccount: string;
  readonly mint: string;
  readonly destinationTokenAccount: string;
  /** Proofs from `generateTransferProofs`. */
  readonly proofs: TransferProofs;
  /** The source's new AES decryptable-available-balance after the transfer (36 bytes). */
  readonly newSourceDecryptableAvailableBalance: Uint8Array;
  readonly commitment?: Commitment;
}

/**
 * End-to-end confidential transfer over `@solana/kit`: generates the ephemeral
 * context-state account signers, fetches rent, builds the multi-transaction plan,
 * and submits it.
 *
 * ⚠️ Landing this requires the `@solana/zk-sdk` proof version to match the target
 * cluster's ZK ElGamal program (see docs/FORK-FINDINGS.md). The construction is
 * validated against real spl-token transactions; live submission is version-gated.
 */
export async function submitConfidentialTransfer(
  params: SubmitConfidentialTransferParams,
): Promise<Signature[]> {
  const [equalityCtx, validityCtx, rangeCtx] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  const sizes = [
    CONTEXT_STATE_ACCOUNT_SIZE["ciphertext-commitment-equality"]!,
    CONTEXT_STATE_ACCOUNT_SIZE["batched-grouped-ciphertext-3-handles-validity"]!,
    CONTEXT_STATE_ACCOUNT_SIZE["batched-range-u128"]!,
  ];
  const rent = new Map<number, bigint>();
  for (const space of new Set(sizes)) {
    rent.set(space, await params.rpc.getMinimumBalanceForRentExemption(BigInt(space)).send());
  }

  const plan = buildConfidentialTransferPlan({
    payer: params.feePayer.address,
    owner: params.owner.address,
    sourceTokenAccount: params.sourceTokenAccount,
    mint: params.mint,
    destinationTokenAccount: params.destinationTokenAccount,
    equalityProof: params.proofs.equalityProof.proof,
    validityProof: params.proofs.validityProof.proof,
    rangeProof: params.proofs.rangeProof.proof,
    equalityContextState: equalityCtx.address,
    validityContextState: validityCtx.address,
    rangeContextState: rangeCtx.address,
    newSourceDecryptableAvailableBalance: params.newSourceDecryptableAvailableBalance,
    transferAmountAuditorCiphertextLo: groupedHandleCiphertext(params.proofs.transferAmountLo, 2),
    transferAmountAuditorCiphertextHi: groupedHandleCiphertext(params.proofs.transferAmountHi, 2),
    rentExemptionForSize: (space) => rent.get(space)!,
  });

  return sendInstructionPlan({
    rpc: params.rpc,
    rpcSubscriptions: params.rpcSubscriptions,
    feePayer: params.feePayer,
    signers: {
      [params.feePayer.address]: params.feePayer,
      [params.owner.address]: params.owner,
      [equalityCtx.address]: equalityCtx,
      [validityCtx.address]: validityCtx,
      [rangeCtx.address]: rangeCtx,
    },
    plan,
    commitment: params.commitment,
  });
}
