import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import { ELGAMAL_PUBKEY_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

const SIGNATURE_LEN = 64;

/**
 * The message a Solana wallet signs to deterministically derive its ElGamal key.
 * The signature is the seed for {@link deriveElGamalSecretFromSignature}; the
 * secret never leaves the client.
 *
 * `publicSeed` defaults to **empty**, which derives the **owner-wide** key — this
 * matches how current `spl-token-cli` derives keys (it signs `b"ElGamalSecretKey"`
 * with no seed). Pass the 32-byte token-account address for the older
 * per-account scheme.
 */
export async function elgamalSignerMessage(
  publicSeed: Uint8Array = new Uint8Array(0),
): Promise<Uint8Array> {
  const zk = await getZk();
  return zk.ElGamalSecretKey.signerMessage(publicSeed);
}

/**
 * The message a wallet signs to derive its AES key. `publicSeed` defaults to
 * empty (the owner-wide key used by current `spl-token-cli`); pass the 32-byte
 * token-account address for the per-account scheme.
 */
export async function aeSignerMessage(
  publicSeed: Uint8Array = new Uint8Array(0),
): Promise<Uint8Array> {
  const zk = await getZk();
  return zk.AeKey.signerMessage(publicSeed);
}

/** Derive the 32-byte ElGamal secret key from a 64-byte ed25519 signature. */
export async function deriveElGamalSecretFromSignature(signature: Uint8Array): Promise<Uint8Array> {
  assertByteLength(signature, SIGNATURE_LEN, "ed25519 signature");
  const zk = await getZk();
  let secret: ReturnType<typeof zk.ElGamalSecretKey.fromSignature> | undefined;
  try {
    secret = zk.ElGamalSecretKey.fromSignature(signature);
    return secret.toBytes();
  } catch (cause) {
    throw new InvalidInputError("ed25519 signature", "could not derive ElGamal key");
  } finally {
    secret?.free();
  }
}

/** Derive the 16-byte AES key from a 64-byte ed25519 signature. */
export async function deriveAeKeyFromSignature(signature: Uint8Array): Promise<Uint8Array> {
  assertByteLength(signature, SIGNATURE_LEN, "ed25519 signature");
  const zk = await getZk();
  let key: ReturnType<typeof zk.AeKey.fromSignature> | undefined;
  try {
    key = zk.AeKey.fromSignature(signature);
    return key.toBytes();
  } catch (cause) {
    throw new InvalidInputError("ed25519 signature", "could not derive AES key");
  } finally {
    key?.free();
  }
}

/** Compute the 32-byte ElGamal public key from a 32-byte secret key. */
export async function elgamalPubkeyFromSecret(secret: Uint8Array): Promise<Uint8Array> {
  assertByteLength(secret, ELGAMAL_SECRET_LEN, "ElGamal secret key");
  const zk = await getZk();
  let secretKey: ReturnType<typeof zk.ElGamalSecretKey.fromBytes> | undefined;
  let pubkey: ReturnType<typeof zk.ElGamalPubkey.fromSecretKey> | undefined;
  try {
    secretKey = zk.ElGamalSecretKey.fromBytes(secret);
    pubkey = zk.ElGamalPubkey.fromSecretKey(secretKey);
    const bytes = pubkey.toBytes();
    assertByteLength(bytes, ELGAMAL_PUBKEY_LEN, "ElGamal public key");
    return bytes;
  } catch (cause) {
    if (cause instanceof InvalidInputError) throw cause;
    throw new InvalidInputError("ElGamal secret key", "could not derive public key");
  } finally {
    secretKey?.free();
    pubkey?.free();
  }
}
