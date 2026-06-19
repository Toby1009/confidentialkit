import { useState } from "react";
import { EncryptDecrypt } from "./EncryptDecrypt.js";
import { runDemo, type DemoResult } from "./pipeline.js";

export function Demo() {
  const [balance, setBalance] = useState("1000");
  const [amount, setAmount] = useState("250");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runDemo(BigInt(balance || "0"), BigInt(amount || "0")));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="lede">
        Everything on this page runs <strong>live in your browser</strong> — no backend, no network
        — over the real <code>@confidentialkit/sdk</code> + <code>@solana/zk-sdk</code> WASM.
      </p>

      <EncryptDecrypt />

      <h3 className="section-h">2 · Build a confidential transfer</h3>
      <p className="dim small" style={{ marginTop: "-0.4rem" }}>
        keys → ZK proofs → verification → recipient &amp; auditor decryption → transaction plan.
      </p>

      <div className="card controls">
        <label>
          Source balance
          <input value={balance} onChange={(e) => setBalance(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label>
          Transfer amount
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
        </label>
        <button className="primary" onClick={run} disabled={busy}>
          {busy ? "Running…" : "Run the pipeline"}
        </button>
      </div>

      {error && <div className="card error">⚠ {error}</div>}

      {result && (
        <>
          <div className="card">
            <h3>Pipeline steps</h3>
            <ol className="steps">
              {result.steps.map((s, i) => (
                <li key={i} className={s.ok ? "ok" : "bad"}>
                  <span className="tick">{s.ok ? "✓" : "✗"}</span>
                  <span>
                    <strong>{s.label}</strong>
                    <em>{s.detail}</em>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid">
            <div className="card stat">
              <span className="num">{result.recipientAmount}</span>
              <span className="cap">recipient decrypts</span>
            </div>
            <div className="card stat">
              <span className="num">{result.auditorAmount}</span>
              <span className="cap">auditor decrypts (compliance)</span>
            </div>
            <div className="card stat">
              <span className="num">{result.newSourceBalance}</span>
              <span className="cap">source's new balance</span>
            </div>
          </div>

          <div className="card">
            <h3>On-chain transaction plan</h3>
            <table>
              <tbody>
                {result.plan.map((tx, i) => (
                  <tr key={i}>
                    <th>tx {i + 1}</th>
                    <td>{tx.label}</td>
                    <td className="dim">{tx.ixCount} ix</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="dim small">
              Landing this on-chain is gated on the ZK ElGamal program re-enabling (token-2022 #657)
              and the <code>@solana/zk-sdk</code> ↔ cluster proof-version match. The construction
              above is validated byte-for-byte against real <code>spl-token</code> transactions.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
