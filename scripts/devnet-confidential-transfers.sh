#!/usr/bin/env bash
#
# Generate a pool of REAL confidential transfers on devnet for the demo faucet.
# For each amount: create a fresh recipient, configure its confidential account,
# send a confidential transfer from the faucet account, apply pending, derive the
# recipient's HKDF key, and emit a pool entry the SDK can decrypt.
#
# Requires: a funded faucet keypair whose confidential account already holds a
# confidential balance (see devnet-confidential-live.sh), spl-token-cli 5.6.1,
# and the keyderive helper (scripts/keyderive).
#
#   devnet-confidential-transfers.sh <faucet-keypair.json> <MINT> [amounts...]
set -uo pipefail

PAYER="${1:?usage: devnet-confidential-transfers.sh <faucet-keypair.json> <MINT> [amounts...]}"
MINT="${2:?missing MINT}"
shift 2
AMOUNTS=("${@:-10 15 20 30 40 50}")

CLI="${SPL_TOKEN_CLI:-spl-token}"          # must be 5.6.1 (version-matched to devnet)
KD="$(cd "$(dirname "$0")/keyderive" && pwd)/target/release/keyderive"
[ -x "$KD" ] || ( cd "$(dirname "$0")/keyderive" && cargo build --release )

solana config set --url https://api.devnet.solana.com --keypair "$PAYER" >/dev/null
OUT="${OUT:-/tmp/ck-pool.ndjson}"; : > "$OUT"

i=0
for AMT in "${AMOUNTS[@]}"; do
  i=$((i+1))
  RCPT="$(mktemp -u).json"
  solana-keygen new --no-bip39-passphrase --force --silent -o "$RCPT" >/dev/null 2>&1
  RPK=$(solana address -k "$RCPT")
  echo ">>> [$i] amount=$AMT owner=$RPK"

  $CLI create-account "$MINT" --owner "$RPK" --fee-payer "$PAYER" >/dev/null 2>&1
  ATA=$($CLI address --token "$MINT" --owner "$RPK" --verbose 2>/dev/null | awk '/Associated/{print $NF}')
  $CLI configure-confidential-transfer-account --address "$ATA" --owner "$RCPT" --fee-payer "$PAYER" >/dev/null 2>&1 || { echo "  configure failed"; continue; }
  TX=$($CLI transfer "$MINT" "$AMT" "$ATA" --confidential --owner "$PAYER" --fee-payer "$PAYER" 2>&1 | awk '/Signature:/{print $2}' | tail -1)
  $CLI apply-pending-balance --address "$ATA" --owner "$RCPT" --fee-payer "$PAYER" >/dev/null 2>&1 || { echo "  apply failed"; continue; }

  # NOTE: the AES decryptable-balance can lag the apply tx on public RPC; re-read
  # until it settles before snapshotting (see SDK fixtures for verified data).
  AEKEY=$("$KD" "$RCPT" "$ATA" | awk -F'ae_key=' '/\[empty\]/{print $2}' | awk '{print $1}')
  echo "  OK ata=$ATA tx=$TX aeKey=$AEKEY"
  printf '{"account":"%s","owner":"%s","amount":%s,"aeKeyHex":"%s","transferTx":"%s"}\n' \
    "$ATA" "$RPK" "$AMT" "$AEKEY" "$TX" >> "$OUT"
done
echo "pool -> $OUT ($(wc -l < "$OUT") entries)"
