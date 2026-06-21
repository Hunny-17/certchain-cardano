# Vault Validator Practice

Phase A.4 practice project from `Paperwork/CIP68_DEV_PLAN.md`.

## Goal

Build a minimal Aiken spending validator:

- Owner locks ADA into the vault script address.
- Only the configured owner payment key hash can withdraw.
- Authorization is checked through `Transaction.extra_signatories`.

## Files

- `aiken.toml` - standalone Aiken project config.
- `validators/vault.ak` - parameterized owner-only spend validator.
- `validators/vault.test.ak` - five unit tests for signature authorization.

## What The Validator Checks

The validator is parameterized by an owner `VerificationKeyHash`.
For the `Withdraw` redeemer, spending succeeds only when the owner key hash is
present in the transaction witness set.

## Test Cases

- Owner signature succeeds.
- Wrong signature fails.
- No signature fails.
- Multiple signatures including owner succeeds.
- Witness set without owner fails.

## Commands

```powershell
aiken check
aiken build
```

## Current Status

- `aiken check` passes: 5/5 unit tests.
- `aiken build` produces `plutus.json`.
- Validator blueprint title: `vault.vault.spend`.
- Validator hash: `c1d353a42934170ac1a83666d4e454b0e29bfbe67635f117dbf8726c`.
- Parameterized Preprod script address:
  `addr_test1wza2w3xkulwz7ze2vd2nn83j4mx49ylx0ezzdl004hn3lmgvh5nfv`.
- Lock ADA test passed:
  `4728b57505e158bf2c428e287cb1792bf9b7111b0472fa2c0053fd70edd4e86a`.
- Reference script deploy passed:
  `331e1d04402ef394878704d788ef405410b5a7f872a64e7f02bbd593e1ee062d`.

## Preprod Validation

- Owner-key unlock through the deployed reference script passed:
  `547b3df82c150477f9abd68df5e60b102bb422a1912a531ce7e591a48ecb42ef`.
- Owner-key unlock with an inline/direct V3 script passed:
  `e2e9e3620d1d250efd638e2edc6cbada8ba6bb0bf2b9a3f6454b5096870a244c`.
- The transaction spent the locked vault UTxO
  `4728b57505e158bf2c428e287cb1792bf9b7111b0472fa2c0053fd70edd4e86a#0`.
- The unlock scripts exclude UTxOs carrying reference scripts from collateral and funding selection.
- The unlock builder evaluates redeemers through Blockfrost before signing.
  This requires Mesh SDK `1.9.1` or later because Plutus V3 needs the V3
  cost model in its script-integrity hash.
- Unauthorized withdrawal behavior is covered by the four negative/local
  authorization tests in `validators/vault.test.ak`; a live wrong-key submit
  is intentionally not attempted because this practice environment holds only
  the authorized custodial wallet.
