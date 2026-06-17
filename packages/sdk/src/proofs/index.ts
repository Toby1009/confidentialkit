import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
import { subtractAmount, subtractTransferAmount } from "../crypto/ciphertext-math.js";
import { ConfidentialKitError, InvalidInputError } from "../errors.js";
import { ELGAMAL_CIPHERTEXT_LEN, ELGAMAL_PUBKEY_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

// Token-2022 confidential-transfer amount split + range-proof shape.
const TRANSFER_AMOUNT_LO_BITS = 16n;
const TRANSFER_AMOUNT_HI_BITS = 32n;
const TRANSFER_LO_MASK = (1n << TRANSFER_AMOUNT_LO_BITS) - 1n;
const MAX_TRANSFER_AMOUNT = (1n << (TRANSFER_AMOUNT_LO_BITS + TRANSFER_AMOUNT_HI_BITS)) - 1n;

/**
 * Client-side generation of the zero-knowledge proofs that the Token-2022
 * confidential-transfer lifecycle requires, built on the audited `@solana/zk-sdk`
 * WASM. We never implement the proof system — these are thin, ergonomic wrappers
 * that take/return raw bytes so the proofs can be uploaded to the on-chain ZK
 * ElGamal proof program.
 *
 * Covers the full lifecycle: pubkey-validity (configure), zero-balance (close),
 * withdraw (equality + range), and transfer (equality + grouped-3-handle
 * validity + range-u128). The transfer/withdraw new-balance ciphertexts are
 * derived homomorphically (see crypto/ciphertext-math.ts). Every generated proof
 * is checkable with {@link verifyProof}, the WASM verifier the chain also runs.
 */
export interface GeneratedProof {
  /**
   * The full proof-data bytes — context ‖ proof — i.e. what the ZK ElGamal proof
   * program reads (inline, or via a context-state account).
   */
  readonly proof: Uint8Array;
  /** Just the public context the proof certifies (for the context-state account). */
  readonly context: Uint8Array;
}

/**
 * Generate a public-key validity proof — used when configuring a confidential
 * account, to certify the account's ElGamal pubkey is well-formed (the prover
 * knows the secret key).
 */
export async function generatePubkeyValidityProof(
  elgamalSecret: Uint8Array,
): Promise<GeneratedProof> {
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  const zk = await getZk();

  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let proof: InstanceType<typeof zk.PubkeyValidityProofData> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    proof = new zk.PubkeyValidityProofData(keypair);
    return extract(proof);
  } finally {
    secret?.free();
    keypair?.free();
    proof?.free();
  }
}

/**
 * Generate a zero-balance proof — certifies that an ElGamal ciphertext encrypts
 * zero. Used to prove an account's confidential balance is empty (e.g. before
 * closing it).
 */
export async function generateZeroBalanceProof(
  elgamalSecret: Uint8Array,
  ciphertext: Uint8Array,
): Promise<GeneratedProof> {
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  assertByteLength(ciphertext, ELGAMAL_CIPHERTEXT_LEN, "ElGamal ciphertext");
  const zk = await getZk();

  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let ct: ReturnType<typeof zk.ElGamalCiphertext.fromBytes>;
  let proof: InstanceType<typeof zk.ZeroCiphertextProofData> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    ct = zk.ElGamalCiphertext.fromBytes(ciphertext);
    if (!ct) throw new InvalidInputError("ElGamal ciphertext", "could not deserialize");
    try {
      proof = new zk.ZeroCiphertextProofData(keypair, ct);
    } catch {
      throw new ConfidentialKitError(
        "Could not generate a zero-balance proof — the ciphertext does not encrypt zero under this key",
      );
    }
    return extract(proof);
  } finally {
    secret?.free();
    keypair?.free();
    ct?.free();
    proof?.free();
  }
}

/** The proofs a confidential withdrawal requires. */
export interface WithdrawProofs {
  /** Certifies the new available-balance ciphertext encrypts the new balance. */
  readonly equalityProof: GeneratedProof;
  /** Certifies the new balance is a valid 64-bit non-negative amount. */
  readonly rangeProof: GeneratedProof;
  /** The new available-balance ElGamal ciphertext after the withdrawal. */
  readonly newAvailableCiphertext: Uint8Array;
  /** The remaining confidential balance, base units. */
  readonly newBalance: bigint;
}

export interface WithdrawProofParams {
  /** The account owner's 32-byte ElGamal secret key. */
  readonly elgamalSecret: Uint8Array;
  /** The current available-balance ElGamal ciphertext (64 bytes). */
  readonly currentAvailableCiphertext: Uint8Array;
  /** The current available balance, base units (the owner knows this). */
  readonly currentBalance: bigint;
  /** Amount to move from the confidential balance back to the public balance. */
  readonly withdrawAmount: bigint;
}

/**
 * Generate the equality + range proofs for a confidential withdrawal. Derives
 * the new available-balance ciphertext homomorphically (no secret randomness
 * needed) and proves it encrypts the new balance, which is in range.
 */
export async function generateWithdrawProofs(
  params: WithdrawProofParams,
): Promise<WithdrawProofs> {
  const { elgamalSecret, currentAvailableCiphertext, currentBalance, withdrawAmount } = params;
  assertByteLength(elgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  assertByteLength(currentAvailableCiphertext, ELGAMAL_CIPHERTEXT_LEN, "available ciphertext");
  if (withdrawAmount < 0n) throw new InvalidInputError("withdrawAmount", "must be non-negative");
  if (withdrawAmount > currentBalance) {
    throw new InvalidInputError("withdrawAmount", "exceeds the current balance");
  }
  const newBalance = currentBalance - withdrawAmount;
  const newAvailableCiphertext = subtractAmount(currentAvailableCiphertext, withdrawAmount);

  const zk = await getZk();
  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let keypair: ReturnType<typeof zk.ElGamalKeypair.fromSecretKey> | undefined;
  let ct: ReturnType<typeof zk.ElGamalCiphertext.fromBytes>;
  let opening: InstanceType<typeof zk.PedersenOpening> | undefined;
  let commitment: ReturnType<typeof zk.PedersenCommitment.from> | undefined;
  let equality: InstanceType<typeof zk.CiphertextCommitmentEqualityProofData> | undefined;
  let range: InstanceType<typeof zk.BatchedRangeProofU64Data> | undefined;
  try {
    try {
      secret = zk.ElGamalSecretKey.fromBytes(elgamalSecret);
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    keypair = zk.ElGamalKeypair.fromSecretKey(secret);
    ct = zk.ElGamalCiphertext.fromBytes(newAvailableCiphertext);
    if (!ct) throw new InvalidInputError("ElGamal ciphertext", "could not deserialize");
    opening = new zk.PedersenOpening();
    commitment = zk.PedersenCommitment.from(newBalance, opening);
    try {
      equality = new zk.CiphertextCommitmentEqualityProofData(
        keypair,
        ct,
        commitment,
        opening,
        newBalance,
      );
      range = new zk.BatchedRangeProofU64Data(
        [commitment],
        new BigUint64Array([newBalance]),
        new Uint8Array([64]),
        [opening],
      );
    } catch (cause) {
      throw new ConfidentialKitError(
        "Withdraw proof generation failed — check that currentBalance matches the ciphertext",
        { cause },
      );
    }
    // The range constructor takes ownership of the commitment and opening (the
    // range proof frees them); drop our references so `finally` doesn't double-free.
    commitment = undefined;
    opening = undefined;
    return {
      equalityProof: extract(equality),
      rangeProof: extract(range),
      newAvailableCiphertext,
      newBalance,
    };
  } finally {
    secret?.free();
    keypair?.free();
    ct?.free();
    opening?.free();
    commitment?.free();
    equality?.free();
    range?.free();
  }
}

/** The proofs a confidential transfer requires (split-proof model). */
export interface TransferProofs {
  /** Certifies the source's new available-balance ciphertext encrypts the new balance. */
  readonly equalityProof: GeneratedProof;
  /** Certifies the transfer-amount ciphertexts are valid under source/dest/auditor keys. */
  readonly validityProof: GeneratedProof;
  /** Certifies the new balance and transfer amount are in range (u128 batched). */
  readonly rangeProof: GeneratedProof;
  /** The grouped 3-handle ciphertext of the low 16 bits of the transfer amount (128 bytes). */
  readonly transferAmountLo: Uint8Array;
  /** The grouped 3-handle ciphertext of the high 32 bits of the transfer amount (128 bytes). */
  readonly transferAmountHi: Uint8Array;
  /** The source's new available-balance ElGamal ciphertext after the transfer. */
  readonly newSourceAvailableCiphertext: Uint8Array;
  /** The source's remaining confidential balance, base units. */
  readonly newSourceBalance: bigint;
}

export interface TransferProofParams {
  /** The source owner's 32-byte ElGamal secret key. */
  readonly sourceElgamalSecret: Uint8Array;
  /** The source's current available-balance ElGamal ciphertext (64 bytes). */
  readonly sourceCurrentAvailableCiphertext: Uint8Array;
  /** The source's current available balance, base units. */
  readonly sourceCurrentBalance: bigint;
  /** Amount to transfer (≤ 48 bits). */
  readonly transferAmount: bigint;
  /** The recipient's 32-byte ElGamal public key. */
  readonly destinationElgamalPubkey: Uint8Array;
  /** Optional auditor ElGamal public key for selective disclosure (compliance). */
  readonly auditorElgamalPubkey?: Uint8Array;
}

/**
 * Generate the equality + ciphertext-validity + range proofs for a confidential
 * transfer, following the Token-2022 split-proof construction. The transfer
 * amount is split into 16-bit `lo` / 32-bit `hi` components, encrypted under the
 * source/destination/auditor keys; the source's new available ciphertext is
 * derived homomorphically to match what the program recomputes on-chain.
 */
export async function generateTransferProofs(
  params: TransferProofParams,
): Promise<TransferProofs> {
  const { sourceElgamalSecret, sourceCurrentAvailableCiphertext, sourceCurrentBalance } = params;
  const { transferAmount, destinationElgamalPubkey, auditorElgamalPubkey } = params;
  assertByteLength(sourceElgamalSecret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  assertByteLength(sourceCurrentAvailableCiphertext, ELGAMAL_CIPHERTEXT_LEN, "available ciphertext");
  assertByteLength(destinationElgamalPubkey, ELGAMAL_PUBKEY_LEN, "destination ElGamal pubkey");
  if (transferAmount < 0n || transferAmount > MAX_TRANSFER_AMOUNT) {
    throw new InvalidInputError("transferAmount", `must be in [0, ${MAX_TRANSFER_AMOUNT}]`);
  }
  if (transferAmount > sourceCurrentBalance) {
    throw new InvalidInputError("transferAmount", "exceeds the source balance");
  }
  const newSourceBalance = sourceCurrentBalance - transferAmount;
  const amountLo = transferAmount & TRANSFER_LO_MASK;
  const amountHi = transferAmount >> TRANSFER_AMOUNT_LO_BITS;
  const auditorBytes = auditorElgamalPubkey ?? new Uint8Array(ELGAMAL_PUBKEY_LEN);

  const zk = await getZk();
  // Track every WASM allocation so we can free exactly once. The range
  // constructor consumes its commitments/openings, so those are nulled below.
  const owned: { free(): void }[] = [];
  const keep = <T extends { free(): void }>(o: T): T => (owned.push(o), o);

  let consumedByRange: ({ free(): void } | undefined)[] = [];
  try {
    let secret;
    try {
      secret = keep(zk.ElGamalSecretKey.fromBytes(sourceElgamalSecret));
    } catch {
      throw new InvalidInputError("ElGamal secret key", "not a valid scalar");
    }
    const keypair = keep(zk.ElGamalKeypair.fromSecretKey(secret));
    const sourcePubkey = keep(keypair.pubkey());
    let destPubkey, auditorPubkey;
    try {
      destPubkey = keep(zk.ElGamalPubkey.fromBytes(destinationElgamalPubkey));
      auditorPubkey = keep(zk.ElGamalPubkey.fromBytes(auditorBytes));
    } catch {
      throw new InvalidInputError("ElGamal pubkey", "not a valid point");
    }

    const openingLo = keep(new zk.PedersenOpening());
    const openingHi = keep(new zk.PedersenOpening());
    const groupedLo = keep(      zk.GroupedElGamalCiphertext3Handles.encryptWith(sourcePubkey, destPubkey, auditorPubkey, amountLo, openingLo),
    );
    const groupedHi = keep(      zk.GroupedElGamalCiphertext3Handles.encryptWith(sourcePubkey, destPubkey, auditorPubkey, amountHi, openingHi),
    );
    const transferAmountLo = groupedLo.toBytes();
    const transferAmountHi = groupedHi.toBytes();

    const newSourceAvailableCiphertext = subtractTransferAmount(
      sourceCurrentAvailableCiphertext,
      transferAmountLo,
      transferAmountHi,
    );
    const newAvailableCt = keep(zk.ElGamalCiphertext.fromBytes(newSourceAvailableCiphertext)!);
    const newOpening = keep(new zk.PedersenOpening());
    const newCommitment = keep(zk.PedersenCommitment.from(newSourceBalance, newOpening));
    const paddingOpening = keep(new zk.PedersenOpening());
    const paddingCommitment = keep(zk.PedersenCommitment.from(0n, paddingOpening));
    const commitmentLo = keep(zk.PedersenCommitment.fromBytes(transferAmountLo.subarray(0, 32)));
    const commitmentHi = keep(zk.PedersenCommitment.fromBytes(transferAmountHi.subarray(0, 32)));

    let equality, validity, range;
    try {
      equality = keep(
        new zk.CiphertextCommitmentEqualityProofData(keypair, newAvailableCt, newCommitment, newOpening, newSourceBalance),
      );
      validity = keep(
        new zk.BatchedGroupedCiphertext3HandlesValidityProofData(
          sourcePubkey, destPubkey, auditorPubkey, groupedLo, groupedHi, amountLo, amountHi, openingLo, openingHi,
        ),
      );
      range = keep(
        new zk.BatchedRangeProofU128Data(
          [newCommitment, commitmentLo, commitmentHi, paddingCommitment],
          new BigUint64Array([newSourceBalance, amountLo, amountHi, 0n]),
          new Uint8Array([64, 16, 32, 16]),
          [newOpening, openingLo, openingHi, paddingOpening],
        ),
      );
    } catch (cause) {
      throw new ConfidentialKitError(
        "Transfer proof generation failed — check that sourceCurrentBalance matches the ciphertext",
        { cause },
      );
    }
    // The range constructor took ownership of these; the range proof frees them.
    consumedByRange = [newCommitment, commitmentLo, commitmentHi, paddingCommitment, newOpening, openingLo, openingHi, paddingOpening];

    return {
      equalityProof: extract(equality),
      validityProof: extract(validity),
      rangeProof: extract(range),
      transferAmountLo,
      transferAmountHi,
      newSourceAvailableCiphertext,
      newSourceBalance,
    };
  } finally {
    const consumed = new Set(consumedByRange);
    for (const o of owned) if (!consumed.has(o)) o.free();
  }
}

/** Proof kinds that {@link verifyProof} can validate. */
export type ProofKind =
  | "pubkey-validity"
  | "zero-balance"
  | "ciphertext-commitment-equality"
  | "batched-range-u64"
  | "batched-range-u128"
  | "batched-grouped-ciphertext-3-handles-validity";

interface VerifiableProof {
  verify(): void;
  free(): void;
}

type ZkModule = Awaited<ReturnType<typeof getZk>>;

const DESERIALIZERS: Record<ProofKind, (zk: ZkModule, b: Uint8Array) => VerifiableProof> = {
  "pubkey-validity": (zk, b) => zk.PubkeyValidityProofData.fromBytes(b),
  "zero-balance": (zk, b) => zk.ZeroCiphertextProofData.fromBytes(b),
  "ciphertext-commitment-equality": (zk, b) =>
    zk.CiphertextCommitmentEqualityProofData.fromBytes(b),
  "batched-range-u64": (zk, b) => zk.BatchedRangeProofU64Data.fromBytes(b),
  "batched-range-u128": (zk, b) => zk.BatchedRangeProofU128Data.fromBytes(b),
  "batched-grouped-ciphertext-3-handles-validity": (zk, b) =>
    zk.BatchedGroupedCiphertext3HandlesValidityProofData.fromBytes(b),
};

/**
 * Verify a generated proof with the same logic the on-chain program runs (the
 * audited WASM verifier). Returns `true` if valid, `false` for an invalid or
 * malformed proof. Useful for client-side checks and testing.
 */
export async function verifyProof(kind: ProofKind, proofBytes: Uint8Array): Promise<boolean> {
  const zk = await getZk();
  const deserialize = DESERIALIZERS[kind];
  if (!deserialize) throw new InvalidInputError("proof kind", kind);

  let proof: VerifiableProof;
  try {
    proof = deserialize(zk, proofBytes);
  } catch {
    return false; // malformed bytes
  }
  try {
    proof.verify();
    return true;
  } catch {
    return false;
  } finally {
    proof.free();
  }
}

interface ProofLike {
  toBytes(): Uint8Array;
  context(): { toBytes(): Uint8Array; free(): void };
}

function extract(proof: ProofLike): GeneratedProof {
  const ctx = proof.context();
  try {
    return { proof: proof.toBytes(), context: ctx.toBytes() };
  } finally {
    ctx.free();
  }
}
