/** Base error type for everything thrown by ConfidentialKit. */
export class ConfidentialKitError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ConfidentialKitError";
  }
}

/** Thrown when input bytes are malformed (wrong length, undeserializable, etc.). */
export class InvalidInputError extends ConfidentialKitError {
  constructor(what: string, detail?: string) {
    super(detail ? `Invalid ${what}: ${detail}` : `Invalid ${what}`);
    this.name = "InvalidInputError";
  }
}

/**
 * Thrown when a ciphertext cannot be decrypted with the supplied key — either
 * the key is wrong, or (for ElGamal) the plaintext is outside the searchable
 * discrete-log range.
 */
export class DecryptionError extends ConfidentialKitError {
  constructor(message = "Failed to decrypt ciphertext with the provided key") {
    super(message);
    this.name = "DecryptionError";
  }
}

/** Thrown when account data does not contain the confidential-transfer extension. */
export class ExtensionNotFoundError extends ConfidentialKitError {
  constructor() {
    super(
      "Account data does not contain a Token-2022 ConfidentialTransferAccount extension",
    );
    this.name = "ExtensionNotFoundError";
  }
}

/**
 * Thrown when the on-chain ZK ElGamal proof program is unavailable on the target
 * cluster. As of mid-2026 it is disabled on mainnet and devnet; ConfidentialKit
 * surfaces this explicitly rather than letting a transaction fail opaquely.
 */
export class ProofProgramDisabledError extends ConfidentialKitError {
  constructor(cluster: string) {
    super(
      `The ZK ElGamal proof program is not available on "${cluster}". ` +
        `Confidential transfers cannot be executed there yet. ` +
        `Run against a local Surfpool mainnet-fork, or watch ` +
        `solana-program/token-2022#657 for re-enablement.`,
    );
    this.name = "ProofProgramDisabledError";
  }
}
