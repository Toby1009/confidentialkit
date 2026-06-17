import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  // `wasm` + `topLevelAwait` let Vite consume the @solana/zk-sdk "bundler" WASM
  // build (which imports its `.wasm` as an ES module).
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    // The SDK's lazy loader references `@solana/zk-sdk/node` (Node-only, pulls in
    // fs/path/util). In the browser we inject the bundler build via setZkModule,
    // so that import path is dead — alias it to the bundler build so Vite never
    // bundles the Node entry.
    alias: { "@solana/zk-sdk/node": "@solana/zk-sdk/bundler" },
  },
  optimizeDeps: { exclude: ["@solana/zk-sdk"] },
  test: {
    environment: "node",
  },
});
