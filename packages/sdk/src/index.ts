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
  verifyProof,
} from "./proofs/index.js";
export type { GeneratedProof, ProofKind } from "./proofs/index.js";

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
