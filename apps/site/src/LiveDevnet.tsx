import { useState } from "react";
import { DEVNET_ACCOUNT, DEVNET_EXPLORER, loadDevnetAccount, type LiveAccount } from "./devnet.js";

export function LiveDevnet() {
  const [acct, setAcct] = useState<LiveAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setAcct(null);
    try {
      setAcct(await loadDevnetAccount());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const tokens = (base: bigint) => `${Number(base) / 1e9} tokens`;

  return (
    <div className="card">
      <h3>1 · Decrypt a real on-chain balance (live from devnet)</h3>
      <p className="dim small">
        Not mock data: a real Token-2022 confidential account on public{" "}
        <strong>devnet</strong>, provisioned with the version-matched{" "}
        <code>spl-token-cli 5.6.1</code>. The SDK fetches it from RPC, decodes the
        on-chain layout, and decrypts the balance — verify it yourself on{" "}
        <a href={DEVNET_EXPLORER} target="_blank" rel="noreferrer">
          Solana Explorer ↗
        </a>
        .
      </p>
      <p className="dim small" style={{ marginTop: "-0.3rem" }}>
        account <code>{DEVNET_ACCOUNT}</code>
      </p>

      <button className="primary" style={{ marginLeft: 0 }} onClick={run} disabled={busy}>
        {busy ? "Fetching…" : "Fetch & decrypt from devnet"}
      </button>

      {error && <p className="reveal bad">⚠ {error}</p>}

      {acct && (
        <div className="flow" style={{ marginTop: "1rem" }}>
          <div className="flow-step">
            <span className="flow-cap">
              on-chain decryptable-balance ciphertext — read from {acct.source}
            </span>
            <code className="cipher">{acct.ciphertextHex}</code>
          </div>
          <div className="flow-step">
            <span className="flow-cap">decrypt with the owner's key</span>
            <p className="reveal ok">
              = {tokens(acct.balanceWithOwnerKey)}
              <span className="dim"> ✓ real balance recovered from devnet</span>
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-cap">decrypt with a wrong key</span>
            <p className="reveal bad">
              {acct.wrongKeyFailed ? "🔒 can't read — wrong key" : "(unexpectedly readable)"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
