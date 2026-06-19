import { useRef, useState } from "react";
import { loadPool, revealTransfer, type PoolEntry, type RevealedTransfer } from "./faucetPool.js";

export function Faucet() {
  const seen = useRef<Set<number>>(new Set());
  const [count, setCount] = useState(0);
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealedTransfer | null>(null);
  const [step, setStep] = useState<"hidden" | "decrypted" | "wrong">("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next() {
    setBusy(true);
    setError(null);
    setReveal(null);
    setStep("hidden");
    try {
      const pool = await loadPool();
      setPoolSize(pool.length);
      if (pool.length === 0) throw new Error("no transfers available");
      // Non-exclusive, cycling: reset once every entry has been shown.
      if (seen.current.size >= pool.length) seen.current.clear();
      const choices = pool
        .map((_, i): number => i)
        .filter((i) => !seen.current.has(i));
      const idx = choices[Math.floor(Math.random() * choices.length)] ?? 0;
      const entry: PoolEntry | undefined = pool[idx];
      if (!entry) throw new Error("no transfers available");
      seen.current.add(idx);
      setReveal(await revealTransfer(entry));
      setCount((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>1 · Receive a real confidential transfer (live on devnet)</h3>
      <p className="dim small">
        Each reveal is a <strong>real confidential transfer</strong> that already landed on public{" "}
        <strong>devnet</strong> — sent with the version-matched <code>spl-token-cli 5.6.1</code> from
        a faucet account to a fresh recipient. The amount is <strong>hidden on-chain</strong>; only
        the recipient's key decrypts it. The SDK does it live in your browser.
      </p>

      <div className="row">
        <button className="primary" style={{ marginLeft: 0 }} onClick={next} disabled={busy}>
          {busy ? "Fetching…" : reveal ? "Reveal another →" : "Reveal a confidential transfer →"}
        </button>
        {poolSize !== null && (
          <span className="dim small">
            revealed {count} · pool of {poolSize.toLocaleString()} real transfers
          </span>
        )}
      </div>

      {error && <p className="reveal bad">⚠ {error}</p>}

      {reveal && (
        <div className="flow" style={{ marginTop: "1rem" }}>
          <div className="flow-step">
            <span className="flow-cap">
              a confidential transfer landed on devnet ({reveal.source})
            </span>
            <p className="dim small" style={{ margin: 0 }}>
              recipient <a href={reveal.accountUrl} target="_blank" rel="noreferrer">{reveal.account.slice(0, 12)}…↗</a>
              {" · "}
              <a href={reveal.transferTxUrl} target="_blank" rel="noreferrer">transfer tx ↗</a>
              {" — on Explorer the amount is just ciphertext."}
            </p>
          </div>

          <div className="flow-step">
            <span className="flow-cap">on-chain balance ciphertext — opaque to everyone</span>
            <code className="cipher">{reveal.ciphertextHex}</code>
          </div>

          <div className="flow-step">
            <span className="flow-cap">decrypt with the recipient's key</span>
            <div className="row">
              <button onClick={() => setStep("decrypted")}>🔑 recipient key</button>
              <button onClick={() => setStep("wrong")}>wrong key</button>
            </div>
            {step === "decrypted" && (
              <p className="reveal ok">
                = {reveal.decryptedTokens} tokens
                <span className="dim"> ✓ the hidden transfer amount, recovered live</span>
              </p>
            )}
            {step === "wrong" && (
              <p className="reveal bad">
                {reveal.wrongKeyFailed ? "🔒 can't read — wrong key" : "(unexpectedly readable)"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
