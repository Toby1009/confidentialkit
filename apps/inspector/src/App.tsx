import { useState } from "react";
import type { Cluster, DecryptedConfidentialAccount } from "@confidentialkit/sdk";
import { buildKeys, inspectOffline, inspectViaRpc } from "./inspector.js";
import { toReport, type Report } from "./format.js";

type Mode = "rpc" | "offline";

export function App() {
  const [mode, setMode] = useState<Mode>("offline");
  const [cluster, setCluster] = useState<Cluster>("localnet");
  const [rpcUrl, setRpcUrl] = useState("");
  const [account, setAccount] = useState("");
  const [accountData, setAccountData] = useState("");
  const [aeKey, setAeKey] = useState("");
  const [elgamalSecret, setElgamalSecret] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const keys = buildKeys(aeKey, elgamalSecret);
      const result: DecryptedConfidentialAccount =
        mode === "offline"
          ? await inspectOffline(accountData, keys)
          : await inspectViaRpc(account, cluster, rpcUrl, keys);
      setReport(toReport(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>ConfidentialKit · Ciphertext Inspector</h1>
        <p className="sub">
          Decode Token-2022 confidential-balance accounts in your browser. Keys never
          leave this page. <strong>Confidentiality, not anonymity</strong> — this hides
          amounts, not identities.
        </p>
      </header>

      <section className="card">
        <div className="tabs">
          <button className={mode === "offline" ? "active" : ""} onClick={() => setMode("offline")}>
            Paste account data
          </button>
          <button className={mode === "rpc" ? "active" : ""} onClick={() => setMode("rpc")}>
            Fetch via RPC
          </button>
        </div>

        {mode === "offline" ? (
          <label>
            Account data (base64)
            <textarea
              rows={4}
              value={accountData}
              onChange={(e) => setAccountData(e.target.value)}
              placeholder="base64-encoded account data from getAccountInfo…"
            />
          </label>
        ) : (
          <>
            <label>
              Account address
              <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="base58…" />
            </label>
            <div className="row">
              <label>
                Cluster
                <select value={cluster} onChange={(e) => setCluster(e.target.value as Cluster)}>
                  <option value="localnet">localnet</option>
                  <option value="devnet">devnet</option>
                  <option value="mainnet-beta">mainnet-beta</option>
                </select>
              </label>
              <label className="grow">
                RPC URL (optional override)
                <input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} placeholder="https://…" />
              </label>
            </div>
          </>
        )}

        <div className="row">
          <label className="grow">
            AES key (hex) — unlocks available balance
            <input value={aeKey} onChange={(e) => setAeKey(e.target.value)} placeholder="optional" />
          </label>
          <label className="grow">
            ElGamal secret (hex) — unlocks pending balance
            <input
              value={elgamalSecret}
              onChange={(e) => setElgamalSecret(e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>

        <button className="primary" onClick={run} disabled={busy}>
          {busy ? "Inspecting…" : "Inspect"}
        </button>
      </section>

      {error && <section className="card error">⚠ {error}</section>}

      {report && (
        <section className="card">
          {report.warning && <p className="warn">⚠ {report.warning}</p>}
          <table>
            <tbody>
              {report.fields.map((f) => (
                <tr key={f.label}>
                  <th>{f.label}</th>
                  <td>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Raw ciphertexts</h3>
          <table>
            <tbody>
              {report.ciphertexts.map((c) => (
                <tr key={c.label}>
                  <th>{c.label}</th>
                  <td className="mono">{c.hex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
