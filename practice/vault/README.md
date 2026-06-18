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

## Current Blocker

Owner-key unlock is not complete yet. Both inline-script spend and
reference-script spend currently submit a transaction that Blockfrost rejects
with `ScriptIntegrityHashMismatch`.

This appears to be a Mesh transaction-builder/script-integrity issue for this
practice V3 spend path, not a unit-test failure in the validator:

- Local signature logic tests pass.
- The parameterized script address resolves.
- Locking ADA at the script address succeeds.
- Deploying the same parameterized script as a reference script succeeds.

The next step is to build the unlock transaction with explicit script
evaluation/redeemer budget handling or a lower-level transaction builder, then
repeat owner unlock and wrong-key failure tests.

## Remaining For Full TASK-A.4

- Complete owner-key unlock on Preprod.
- Attempt unlock with the wrong key and confirm failure.
