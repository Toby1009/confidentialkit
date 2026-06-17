# @confidentialkit/kit

`@solana/kit` adapter for ConfidentialKit. The core `@confidentialkit/sdk` emits
library-agnostic `InstructionDescriptor`s; this package maps them onto
`@solana/kit` instructions and submits multi-transaction plans.

## Install

```bash
npm install @confidentialkit/kit @confidentialkit/sdk @solana/kit
```

## What's here

- **`inspectConfidentialAccount(rpc, account, keys?)`** — fetch a confidential
  account via `@solana/kit` and decode/decrypt it (the network counterpart to the
  core SDK's offline `decodeConfidentialAccount`; the SDK itself stays network-free).
- **`toKitInstruction(descriptor, signers?)`** — convert an `InstructionDescriptor`
  to a kit instruction, attaching `TransactionSigner`s to signer-role accounts.
- **`sendInstructionPlan({ rpc, rpcSubscriptions, feePayer, signers, plan })`** —
  sign and send an ordered plan (array of transactions) one at a time, awaiting
  confirmation between them. Returns the landed signatures.
- **`submitConfidentialTransfer({ ... })`** — end-to-end: generates the ephemeral
  context-state account signers, fetches rent, builds the plan via
  `buildConfidentialTransferPlan`, and submits it.

## Example

```ts
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { generateTransferProofs } from "@confidentialkit/sdk";
import { submitConfidentialTransfer } from "@confidentialkit/kit";

const proofs = await generateTransferProofs({ /* ... */ });
const signatures = await submitConfidentialTransfer({
  rpc: createSolanaRpc(url),
  rpcSubscriptions: createSolanaRpcSubscriptions(wsUrl),
  feePayer,
  owner,
  sourceTokenAccount, mint, destinationTokenAccount,
  proofs,
  newSourceDecryptableAvailableBalance, // AES-encrypted new balance under the source key
});
```

> ⚠️ **Liveness.** *Landing* a confidential transfer additionally requires the
> `@solana/zk-sdk` proof version to match the target cluster's ZK ElGamal program
> (see [`docs/FORK-FINDINGS.md`](../../docs/FORK-FINDINGS.md)). The submission
> *mechanism* is validated on a fork via `scripts/kit-submit-mechanism.mjs`; the
> proof-bearing steps are version-gated.

MIT
