#!/usr/bin/env bash
#
# Reproduce a LIVE non-zero Token-2022 confidential account on public devnet,
# then decrypt it with @confidentialkit/sdk. See docs/FORK-FINDINGS.md.
#
# The key insight (the project thesis): two narrow layers are version-pinned and
# silently break — the ZK *proof transcript* and the *key-derivation KDF*. Devnet
# runs agave 4.1.0-rc.1, so you must use the version-matched spl-token-cli 5.6.1
# (built on solana-zk-sdk 7.0.x). The older 5.5.0 is rejected with
# `SigmaProof(PubkeyValidity, AlgebraicRelation)`.
#
# Prereqs: solana CLI, a funded devnet keypair, Rust/cargo.
set -euo pipefail

KP="${1:?usage: devnet-confidential-live.sh <funded-devnet-keypair.json>}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> install the version-matched CLI (matches devnet agave 4.1.x)"
cargo install spl-token-cli --version 5.6.1 --root /tmp/spl561 --locked
CLI=/tmp/spl561/bin/spl-token

solana config set --url https://api.devnet.solana.com --keypair "$KP"
echo "devnet version: $(solana cluster-version)"

echo "==> create a confidential-transfer mint + account"
MINT_KP=$(mktemp -u).json
solana-keygen new --no-bip39-passphrase --force --silent -o "$MINT_KP"
$CLI create-token --program-2022 --enable-confidential-transfers auto "$MINT_KP"
MINT=$(solana address -k "$MINT_KP")
$CLI create-account "$MINT"

echo "==> configure + deposit + apply (each submits a ZK proof devnet verifies)"
$CLI configure-confidential-transfer-account --address "$($CLI address --token "$MINT" --verbose | awk '/Associated/{print $NF}')"
$CLI mint "$MINT" 600
$CLI deposit-confidential-tokens "$MINT" 600
ACCT=$($CLI address --token "$MINT" --verbose | awk '/Associated/{print $NF}')
$CLI apply-pending-balance --address "$ACCT"
$CLI account-info --address "$ACCT"

echo "==> derive the matching keys (HKDF-SHA512, owner-wide) and print them"
echo "    The on-chain ElGamal pubkey must equal the derived one."
( cd "$HERE/keyderive" && cargo run --release -- "$KP" "$ACCT" )

cat <<EOF

Done. Feed the printed AES key (raw bytes) to the SDK:
  decodeConfidentialAccount(data, { keys: { aeKey } }).availableBalance  // => 600000000000n
Explorer: https://explorer.solana.com/address/$ACCT?cluster=devnet
EOF
