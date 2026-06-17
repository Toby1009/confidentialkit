# @confidentialkit/sdk

Ergonomic TypeScript SDK for **Solana Token-2022 Confidential Balances**, built on
the audited [`@solana/zk-sdk`](https://www.npmjs.com/package/@solana/zk-sdk) WASM
module. It parses the on-chain confidential-transfer account state and decrypts
balances — the read/inspect path that powers debugging (the missing
`spl-token --decrypt`, [token-2022#145](https://github.com/solana-program/token-2022/issues/145)).

> All cryptography is delegated to `@solana/zk-sdk`. This package never
> implements ElGamal/AES itself — it provides parsing, ergonomics, and lifecycle
> management around the audited primitives.

## Install

```bash
npm install @confidentialkit/sdk
```

## Usage

### Inspect an account via RPC

```ts
import { ConfidentialKit } from "@confidentialkit/sdk";

const kit = new ConfidentialKit({ cluster: "localnet" }); // Surfpool fork

// Inspector mode — raw ciphertexts, no keys needed:
const raw = await kit.inspect(accountAddress);
console.log(raw.state.ciphertexts);

// With owner keys — decrypted balances:
const result = await kit.inspect(accountAddress, { aeKey, elgamalSecret });
console.log(result.availableBalance, result.pendingBalance);
```

### Decode account bytes you already have (offline / browser)

```ts
import { decodeConfidentialAccount } from "@confidentialkit/sdk";

const result = await decodeConfidentialAccount(accountData, { keys: { aeKey } });
```

### Decrypt a single ciphertext

```ts
import { decryptAeCiphertext, decryptElGamalCiphertext } from "@confidentialkit/sdk";

const available = await decryptAeCiphertext(aeCiphertext, aeKey);
const pendingLo = await decryptElGamalCiphertext(elgamalCiphertext, elgamalSecret);
```

### Derive keys from a wallet signature

```ts
import {
  elgamalSignerMessage,
  deriveElGamalSecretFromSignature,
} from "@confidentialkit/sdk";

const message = await elgamalSignerMessage(accountAddressBytes);
const signature = await wallet.signMessage(message); // 64-byte ed25519
const elgamalSecret = await deriveElGamalSecretFromSignature(signature);
```

## Browser usage

The Node WASM build loads automatically. In a browser, inject the bundler/web
build once at startup:

```ts
import { setZkModule } from "@confidentialkit/sdk";
setZkModule(await import("@solana/zk-sdk/bundler"));
```

## Notes

- **Available** balance is read from the AES "decryptable" ciphertext (instant,
  exact) using the AES key. **Pending** balance is reconstructed from the
  `lo`/`hi` ElGamal ciphertexts using the ElGamal secret (a bounded discrete-log
  search — fast for small pending balances).
- Confidential transfers hide **amounts, not identities**.
- This SDK covers the **read path**. On-chain transfer construction is gated on
  the ZK ElGamal proof program being re-enabled — see the repo roadmap.

MIT
