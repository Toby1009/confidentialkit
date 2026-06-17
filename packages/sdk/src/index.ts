// Client facade
export { ConfidentialKit } from "./client.js";
export type { Cluster, ConfidentialKitConfig } from "./client.js";

// High-level decode
export { decodeConfidentialAccount } from "./decode.js";
export type { DecodeOptions, DecryptKeys } from "./decode.js";

// State parsing (key-free inspector path)
export { parseConfidentialAccount } from "./state/confidential-account.js";
export { findExtension } from "./state/tlv.js";
export {
  AccountType,
  ExtensionType,
  CtAccountLayout,
  CT_ACCOUNT_LEN,
  BASE_ACCOUNT_LEN,
} from "./state/extension.js";

// Crypto primitives
export { decryptElGamalCiphertext, decryptAeCiphertext } from "./crypto/decrypt.js";
export {
  elgamalSignerMessage,
  aeSignerMessage,
  deriveElGamalSecretFromSignature,
  deriveAeKeyFromSignature,
  elgamalPubkeyFromSecret,
} from "./crypto/keys.js";

// Proof generation
export {
  generatePubkeyValidityProof,
  generateZeroBalanceProof,
  generateWithdrawProofs,
  generateTransferProofs,
  verifyProof,
} from "./proofs/index.js";
export type {
  GeneratedProof,
  ProofKind,
  WithdrawProofs,
  WithdrawProofParams,
  TransferProofs,
  TransferProofParams,
} from "./proofs/index.js";

// Homomorphic ciphertext arithmetic
export { subtractAmount, addAmount, subtractTransferAmount } from "./crypto/ciphertext-math.js";

// Instruction encoding (library-agnostic descriptors → @solana/kit)
export {
  encodeVerifyProofInstruction,
  encodeCloseContextStateInstruction,
  ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
} from "./instructions/zk-program.js";
export type { ContextStateInfo } from "./instructions/zk-program.js";
export {
  encodeConfidentialWithdrawInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "./instructions/token2022.js";
export type { ConfidentialWithdrawParams } from "./instructions/token2022.js";
export type {
  InstructionDescriptor,
  InstructionAccount,
  AccountRole,
} from "./instructions/types.js";

// RPC
export { fetchAccountData } from "./rpc.js";

// WASM control (browser hosts inject their own build)
export { setZkModule, getZk } from "./wasm.js";
export type { ZkModule } from "./wasm.js";

// Byte helpers
export {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  base58ToBytes,
  bytesToBase58,
  decodeBytes,
} from "./bytes.js";
export type { ByteEncoding } from "./bytes.js";

// Types & errors
export * from "./types.js";
export * from "./errors.js";
