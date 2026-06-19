interface Pkg {
  readonly name: string;
  readonly tagline: string;
  readonly install: string;
  readonly features: string[];
  readonly snippet: string;
  readonly npm: string;
}

const PACKAGES: Pkg[] = [
  {
    name: "@confidentialkit/sdk",
    tagline: "The core — network-free, offline-first.",
    install: "npm install @confidentialkit/sdk",
    features: [
      "Parse Token-2022 confidential accounts (TLV) + decrypt available (AES) / pending (ElGamal) balances",
      "Derive owner keys from wallet signatures",
      "Generate the full ZK proof set: configure / close / withdraw / transfer",
      "Encode Token-2022 + ZK-program instructions; build the multi-transaction plan",
      "All over the audited @solana/zk-sdk WASM — never rolls its own crypto",
    ],
    snippet: `import { decodeConfidentialAccount } from "@confidentialkit/sdk";

const result = await decodeConfidentialAccount(accountBytes, {
  keys: { aeKey, elgamalSecret },
});
console.log(result.availableBalance, result.pendingBalance);`,
    npm: "https://www.npmjs.com/package/@confidentialkit/sdk",
  },
  {
    name: "@confidentialkit/cli",
    tagline: "Inspect + decrypt from the terminal.",
    install: "npm install -g @confidentialkit/cli",
    features: [
      "confidentialkit inspect <account> — raw ciphertexts or decrypted balances",
      "confidentialkit decrypt <ciphertext> — the missing `spl-token --decrypt`",
      "Solves token-2022 #145: raw ElGamal/AES bytes → human-readable balances",
      "Works offline (paste base64) or against any RPC / Surfpool fork",
    ],
    snippet: `confidentialkit inspect <ACCOUNT> --url http://127.0.0.1:8899 \\
  --ae-key-file ae.key

confidentialkit decrypt <HEX> --type ae --key-file ae.key`,
    npm: "https://www.npmjs.com/package/@confidentialkit/cli",
  },
  {
    name: "@confidentialkit/kit",
    tagline: "@solana/kit adapter — fetch + submit.",
    install: "npm install @confidentialkit/kit @solana/kit",
    features: [
      "inspectConfidentialAccount(rpc, account, keys?) — fetch via RPC + decode",
      "toKitInstruction — map ConfidentialKit instruction descriptors to @solana/kit",
      "sendInstructionPlan — sign/send the ordered multi-transaction plan",
      "submitConfidentialTransfer — ephemeral context-state signers + rent + submit",
    ],
    snippet: `import { createSolanaRpc } from "@solana/kit";
import { inspectConfidentialAccount } from "@confidentialkit/kit";

const rpc = createSolanaRpc(url);
const result = await inspectConfidentialAccount(rpc, account, { aeKey });`,
    npm: "https://www.npmjs.com/package/@confidentialkit/kit",
  },
];

export function Docs() {
  return (
    <section>
      <p className="lede">
        Three packages, one toolkit for Solana Token-2022 Confidential Balances. MIT, published to
        npm with build provenance, validated byte-for-byte against real <code>spl-token</code>{" "}
        transactions.
      </p>
      <div className="pkgs">
        {PACKAGES.map((p) => (
          <article className="card pkg" key={p.name}>
            <h3>{p.name}</h3>
            <p className="tagline">{p.tagline}</p>
            <pre className="install">{p.install}</pre>
            <ul>
              {p.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <pre className="snippet">{p.snippet}</pre>
            <a href={p.npm} target="_blank" rel="noreferrer">
              View on npm ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
