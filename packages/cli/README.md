# @confidentialkit/cli

Command-line tool for inspecting and decrypting **Solana Token-2022 Confidential
Balances** — the missing `spl-token --decrypt`
([token-2022#145](https://github.com/solana-program/token-2022/issues/145)).

## Install

```bash
npm install -g @confidentialkit/cli
```

## Commands

### `inspect`

Fetch a confidential account from RPC (or decode local bytes) and print its state.

```bash
# Raw inspector view (no keys):
confidentialkit inspect <ACCOUNT> --cluster localnet

# Decrypt balances with the owner's keys:
confidentialkit inspect <ACCOUNT> \
  --ae-key-file ae.key --elgamal-secret-file elgamal.key

# Offline: decode account data you already have:
confidentialkit inspect --account-data <BASE64> --json
```

### `decrypt`

Decrypt a single ciphertext to a `u64` amount.

```bash
# AES decryptable-available-balance (36 bytes):
confidentialkit decrypt <HEX> --type ae --key-file ae.key

# ElGamal ciphertext (64 bytes):
confidentialkit decrypt <HEX> --type elgamal --key-file elgamal.key
```

## Security

Prefer `--key-file` / `--ae-key-file` / `--elgamal-secret-file` over inline
flags: command-line arguments leak into shell history and the process list.

MIT
