import { useState } from "react";
import { Demo } from "./Demo.js";
import { Docs } from "./Docs.js";

type Tab = "demo" | "docs";

export function App() {
  const [tab, setTab] = useState<Tab>("demo");

  return (
    <main className="app">
      <header className="masthead">
        <div>
          <h1>ConfidentialKit</h1>
          <p className="sub">
            The open-source TypeScript toolkit for Solana{" "}
            <strong>Token-2022 Confidential Balances</strong> — confidentiality, not anonymity.
          </p>
        </div>
        <a className="gh" href="https://github.com/Toby1009/confidentialkit" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </header>

      <nav className="tabs">
        <button className={tab === "demo" ? "active" : ""} onClick={() => setTab("demo")}>
          Live demo
        </button>
        <button className={tab === "docs" ? "active" : ""} onClick={() => setTab("docs")}>
          Packages
        </button>
      </nav>

      {tab === "demo" ? <Demo /> : <Docs />}

      <footer>
        MIT · built on{" "}
        <a href="https://www.npmjs.com/package/@solana/zk-sdk" target="_blank" rel="noreferrer">
          @solana/zk-sdk
        </a>{" "}
        · everything on this page runs client-side in your browser
      </footer>
    </main>
  );
}
