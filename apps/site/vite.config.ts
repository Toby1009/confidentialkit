import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    // The SDK's lazy loader references @solana/zk-sdk/node; in the browser we
    // inject the bundler build, so alias the dead Node path to it.
    alias: { "@solana/zk-sdk/node": "@solana/zk-sdk/bundler" },
  },
  optimizeDeps: { exclude: ["@solana/zk-sdk"] },
});
