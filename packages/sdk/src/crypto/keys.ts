import { getZk } from "../wasm.js";
import { assertByteLength } from "../bytes.js";
import { InvalidInputError } from "../errors.js";
import { ELGAMAL_PUBKEY_LEN, ELGAMAL_SECRET_LEN } from "../types.js";

const ACCOUNT_ADDRESS_LEN = 32;

/**
 * The message a Solana wallet must sign to deterministically derive its ElGamal
 * key for a given token account. The signature is the seed for
 * {@link deriveElGamalSecretFromSignature}; the secret never leaves the client.
 */
export async function elgamalSignerMessage(accountAddress: Uint8Array): Promise<Uint8Array> {
  assertByteLength(accountAddress, ACCOUNT_ADDRESS_LEN, "account address");
  const zk = await getZk();
  return zk.ElGamalSecretKey.signerMessage(accountAddress);
}

/** The message a wallet signs to derive its AES key for a token account. */
export async function aeSignerMessage(accountAddress: Uint8Array): Promise<Uint8Array> {
  assertByteLength(accountAddress, ACCOUNT_ADDRESS_LEN, "account address");
  const zk = await getZk();
  return zk.AeKey.signerMessage(accountAddress);
}

/** Derive the 32-byte ElGamal secret key from a 64-byte ed25519 signature. */
export async function deriveElGamalSecretFromSignature(signature: Uint8Array): Promise<Uint8Array> {
  const zk = await getZk();
  const secret = zk.ElGamalSecretKey.fromSignature(signature);
  try {
    return secret.toBytes();
  } finally {
    secret.free();
  }
}

/** Derive the 16-byte AES key from a 64-byte ed25519 signature. */
export async function deriveAeKeyFromSignature(signature: Uint8Array): Promise<Uint8Array> {
  const zk = await getZk();
  const key = zk.AeKey.fromSignature(signature);
  try {
    return key.toBytes();
  } finally {
    key.free();
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
