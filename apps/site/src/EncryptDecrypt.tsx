import { useState } from "react";
import { decryptBalance, encryptBalance, type EncryptedBalance } from "./pipeline.js";

export function EncryptDecrypt() {
  const [amount, setAmount] = useState("1000");
  const [enc, setEnc] = useState<EncryptedBalance | null>(null);
  const [revealed, setRevealed] = useState<{ text: string; ok: boolean } | null>(null);

  function doEncrypt() {
    setRevealed(null);
    setEnc(encryptBalance(BigInt(amount || "0")));
  }

  async function doDecrypt(useWrongKey: boolean) {
    if (!enc) return;
    const value = await decryptBalance(enc, useWrongKey);
    setRevealed(
      value === null
        ? { text: "🔒 can't read — wrong key", ok: false }
        : { text: `= ${value}`, ok: true },
    );
  }

  return (
    <div className="card">
      <h3>2 · Encrypt &amp; decrypt your own number</h3>
      <p className="dim small">
        Same SDK, your input. Token-2022 stores balances as ciphertexts — without the owner's key,
        an on-chain amount is just opaque bytes. That's the "confidential" in confidential balances.
      </p>

      <div className="flow">
        <div className="flow-step">
          <span className="flow-cap">plaintext amount</span>
          <div className="row">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <button className="primary" onClick={doEncrypt}>
              Encrypt →
            </button>
          </div>
        </div>

        {enc && (
          <>
            <div className="flow-step">
              <span className="flow-cap">on-chain ciphertext — opaque to everyone</span>
              <code className="cipher">{enc.ciphertextHex}</code>
            </div>

            <div className="flow-step">
              <span className="flow-cap">decrypt</span>
              <div className="row">
                <button onClick={() => doDecrypt(false)}>🔑 owner key</button>
                <button onClick={() => doDecrypt(true)}>wrong key</button>
              </div>
              {revealed && (
                <p className={revealed.ok ? "reveal ok" : "reveal bad"}>
                  {revealed.text}
                  {revealed.ok && <span className="dim"> ✓ matches the plaintext</span>}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
