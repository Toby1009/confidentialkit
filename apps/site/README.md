# ConfidentialKit — demo + docs site

A lightweight Vite + React site with two tabs:

- **Live demo** — runs the entire confidential-transfer construction pipeline in
  the browser (keys → ZK proofs → verification → recipient/auditor decryption →
  transaction plan) over the real `@confidentialkit/sdk` + `@solana/zk-sdk` WASM.
- **Packages** — what `@confidentialkit/sdk`, `cli`, and `kit` do, with install
  commands and snippets.

## Develop

```bash
pnpm --filter @confidentialkit/site dev      # http://localhost:5173
pnpm --filter @confidentialkit/site build    # static bundle → dist/
```

## Deploy to Vercel

The repo root `vercel.json` configures the monorepo build. Connect the GitHub
repo in Vercel, keep the Root Directory at the repo root, and deploy — it builds
`@confidentialkit/sdk` then this site and serves `apps/site/dist`.
