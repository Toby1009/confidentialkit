#!/usr/bin/env bash
#
# Stand up a local Solana mainnet-fork with Token-2022 cloned, so the full
# confidential-transfer flow can be reproduced and demoed today — even while the
# on-chain ZK ElGamal proof program is disabled on live clusters.
#
# Requires: surfpool (https://github.com/txtx/surfpool) on PATH.
#   cargo install surfpool   # or: brew install txtx/taps/surfpool
#
# Week-1 gate (docs/ROADMAP.md): if you cannot reproduce the confidential flow on
# this fork, pivot to the runner-up (Light Protocol ZK-compression tooling).

set -euo pipefail

TOKEN_2022_PROGRAM_ID="TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
ZK_ELGAMAL_PROGRAM_ID="ZkE1Gama1Proof11111111111111111111111111111"
RPC_PORT="${RPC_PORT:-8899}"

if ! command -v surfpool >/dev/null 2>&1; then
  echo "error: surfpool not found on PATH." >&2
  echo "  install: cargo install surfpool  (or brew install txtx/taps/surfpool)" >&2
  exit 1
fi

echo "Starting Surfpool mainnet-fork on http://127.0.0.1:${RPC_PORT}"
echo "  cloning Token-2022:   ${TOKEN_2022_PROGRAM_ID}"
echo "  ZK ElGamal program:   ${ZK_ELGAMAL_PROGRAM_ID} (disabled on live clusters)"
echo

# surfpool clones accounts/programs lazily from a remote mainnet RPC on first
# access. Passing the program ids up front warms the cache and surfaces clone
# failures immediately (the Week-1 kill/pivot signal).
exec surfpool start \
  --rpc-port "${RPC_PORT}" \
  --no-tui
