import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as zkBundler from "@solana/zk-sdk/bundler";
import { setZkModule, type ZkModule } from "@confidentialkit/sdk";
import { App } from "./App.js";
import "./styles.css";

// The bundler WASM build is instantiated by the time this import resolves
// (vite-plugin-wasm + top-level-await). Hand it to the SDK so all crypto runs
// in-browser. The bundler/node namespaces are structurally identical.
setZkModule(zkBundler as unknown as ZkModule);

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
