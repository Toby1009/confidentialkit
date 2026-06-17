#!/usr/bin/env bash
#
# Week-1 de-risk gate: stand up a surfpool mainnet-fork and exercise the
# Token-2022 confidential-transfer flow with the real spl-token CLI, then dump a
# real confidential account so the SDK parser can be validated against on-chain
# program output (see packages/sdk/src/state/real-account.test.ts).
#
# Empirical findings on this environment (Agave 4.0.1 / spl-token-cli 5.5.0 /
# surfpool 1.0.0), recorded in docs/FORK-FINDINGS.md:
#   - The ZK ElGamal proof program IS executable on a surfpool fork.
#   - `configure-confidential-transfer-account` SUCCEEDS (submits a real
#     pubkey-validity proof to the ZK program).
#   - `deposit-confidential-tokens` / `apply-pending-balance` are REJECTED with
#     InvalidInstructionData, because the Token-2022 program cloned from mainnet
#     is the post-2025-06-11 build with confidential transfers disabled.
#     => To run the full flow, target a current Token-2022 (see the doc).
#
# Requires: solana CLI + spl-token on PATH, surfpool on PATH.
set -euo pipefail

WORKDIR="${WORKDIR:-.surfpool-run}"
RPC="${RPC:-http://127.0.0.1:8899}"
CONFIG="$WORKDIR/solana-config.yml"
mkdir -p "$WORKDIR"

sol() { solana -C "$CONFIG" "$@"; }
tok() { spl-token -C "$CONFIG" "$@"; }

echo "→ Using isolated solana config at $CONFIG (your global config is untouched)"
solana-keygen new -o "$WORKDIR/payer.json" --no-bip39-passphrase --force --silent >/dev/null
sol config set --url "$RPC" --keypair "$WORKDIR/payer.json" >/dev/null
sol airdrop 100 >/dev/null
echo "→ Funded payer: $(solana-keygen pubkey "$WORKDIR/payer.json")"

solana-keygen new -o "$WORKDIR/mint.json" --no-bip39-passphrase --force --silent >/dev/null
MINT=$(solana-keygen pubkey "$WORKDIR/mint.json")
echo "→ Creating confidential mint $MINT"
tok create-token --program-2022 --enable-confidential-transfers auto "$WORKDIR/mint.json" >/dev/null

ACCT=$(tok create-account "$MINT" | awk '/Creating account/ {print $3}')
echo "→ Created token account $ACCT"
tok configure-confidential-transfer-account --address "$ACCT" >/dev/null
echo "→ Configured confidential transfers (ZK pubkey-validity proof accepted)"

tok mint "$MINT" 1000 >/dev/null
echo "→ Minted 1000 public tokens"

echo "→ Attempting confidential deposit (expected to fail on a mainnet-cloned Token-2022):"
if tok deposit-confidential-tokens "$MINT" 600 >/dev/null 2>&1; then
  echo "  ✓ deposit succeeded — full flow is reproducible here!"
else
  echo "  ✗ deposit rejected (InvalidInstructionData) — confidential transfers disabled"
  echo "    in the cloned mainnet Token-2022. This is the documented liveness wall."
fi

echo "→ Dumping real configured account to $WORKDIR/real-account.base64"
curl -s "$RPC" -X POST -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$ACCT\",{\"encoding\":\"base64\"}]}" \
  | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).result.value.data[0])' \
  > "$WORKDIR/real-account.base64"

echo "→ Validating with the ConfidentialKit CLI:"
node packages/cli/dist/index.js inspect "$ACCT" --url "$RPC"
