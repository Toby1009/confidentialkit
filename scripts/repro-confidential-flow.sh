#!/usr/bin/env bash
#
# Week-1 de-risk gate, fully reproduced: against a RUNNING surfpool mainnet-fork,
# deploy a CURRENT Token-2022 onto the canonical program id (the mainnet-cloned
# build has confidential transfers disabled), run the full confidential flow
# (configure -> deposit -> apply), and dump a real non-zero account that the SDK
# can decrypt. See docs/FORK-FINDINGS.md.
#
# Start the fork first in another terminal:  pnpm fork:up
#   (i.e. `surfpool start --network mainnet --no-tui --port 8899`)
#
# Requires: solana CLI + spl-token + cargo-build-sbf + git on PATH, and a
# surfpool fork listening at $RPC.
set -euo pipefail

WORKDIR="${WORKDIR:-.surfpool-run}"
RPC="${RPC:-http://127.0.0.1:8899}"
CONFIG="$WORKDIR/solana-config.yml"
BUILD="${BUILD:-$HOME/.confidentialkit-build}"
TOKEN_2022="TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
mkdir -p "$WORKDIR"

sol() { solana -C "$CONFIG" "$@"; }
tok() { spl-token -C "$CONFIG" "$@"; }

# 0. Require a running fork — this script does not start surfpool itself.
if ! curl -s "$RPC" -X POST -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' | grep -q '"result"'; then
  echo "error: no Solana RPC at $RPC." >&2
  echo "  Start a fork first:  pnpm fork:up   (surfpool start --network mainnet --no-tui)" >&2
  exit 1
fi

# 1. Build a current Token-2022 .so (skip if already built).
SO="$BUILD/token-2022/target/deploy/spl_token_2022.so"
if [ ! -f "$SO" ]; then
  echo "→ Cloning + building current Token-2022 (cargo-build-sbf)…"
  mkdir -p "$BUILD"
  [ -d "$BUILD/token-2022" ] || git clone --depth 1 https://github.com/solana-program/token-2022.git "$BUILD/token-2022"
  ( cd "$BUILD/token-2022/program" && cargo-build-sbf )
fi
echo "→ Token-2022 .so: $SO ($(wc -c < "$SO") bytes)"

# 2. Configure an isolated solana config + funded payer (global config untouched).
solana-keygen new -o "$WORKDIR/payer.json" --no-bip39-passphrase --force --silent >/dev/null
sol config set --url "$RPC" --keypair "$WORKDIR/payer.json" >/dev/null
sol airdrop 100 >/dev/null
echo "→ Funded payer: $(solana-keygen pubkey "$WORKDIR/payer.json")"

# 3. Overwrite the canonical Token-2022 (BPFLoader2 stores the ELF in the account)
#    with our current build via surfpool's cheat RPC.
echo "→ Overriding $TOKEN_2022 with the current build (surfnet_setAccount)…"
node -e '
const fs = require("fs");
const so = fs.readFileSync(process.argv[1]);
(async () => {
  const body = { jsonrpc:"2.0", id:1, method:"surfnet_setAccount", params:[
    process.argv[2],
    { data: so.toString("hex"), owner: "BPFLoader2111111111111111111111111111111111", executable: true },
  ]};
  const r = await fetch(process.argv[3], { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) { console.error(j.error); process.exit(1); }
})();
' "$SO" "$TOKEN_2022" "$RPC"

# 4. Full confidential flow on the canonical program.
solana-keygen new -o "$WORKDIR/mint.json" --no-bip39-passphrase --force --silent >/dev/null
MINT=$(solana-keygen pubkey "$WORKDIR/mint.json")
tok create-token --program-2022 --enable-confidential-transfers auto "$WORKDIR/mint.json" >/dev/null
ACCT=$(tok create-account "$MINT" | awk '/Creating account/ {print $3}')
tok configure-confidential-transfer-account --address "$ACCT" >/dev/null
tok mint "$MINT" 1000 >/dev/null
echo "→ deposit 600 confidential…";   tok deposit-confidential-tokens "$MINT" 600 >/dev/null && echo "  ✓ deposited"
echo "→ apply pending balance…";       tok apply-pending-balance --address "$ACCT" >/dev/null && echo "  ✓ applied"

# 5. Dump + validate with the ConfidentialKit CLI.
echo "→ Real confidential account $ACCT:"
node packages/cli/dist/index.js inspect "$ACCT" --url "$RPC"
echo "→ Done. The owner can now decrypt the available balance (600 tokens) with their AES key."
