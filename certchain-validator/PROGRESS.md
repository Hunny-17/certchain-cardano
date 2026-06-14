# V3 CIP-68 Progress

This file tracks the implementation against `Paperwork/CIP68_DEV_PLAN.md`.

## Phase A - Foundation

- [ ] TASK-A.1 Functional programming basics: not tracked in repo.
- [ ] TASK-A.2 Aiken syntax + Plutus context: not tracked in repo.
- [ ] TASK-A.3 UTxO model deep dive: not tracked in repo.
- [ ] TASK-A.4 Vault validator practice: not present in repo.
- [ ] TASK-A.5 Token swap escrow practice: not present in repo.

Phase A was bypassed in the repository timeline; the production V3 work was
implemented directly.

## Phase B - Design

- [x] TASK-B.1 Authorization model: single issuer signature.
- [x] TASK-B.2 Datum schema: documented in `DESIGN.md`.
- [x] TASK-B.3 Action types: documented in `DESIGN.md`.
- [x] TASK-B.4 Migration strategy: documented in `DESIGN.md`.
- [x] TASK-B.5 Gas optimization plan: documented in `DESIGN.md`.

## Phase C - Validator Implementation

- [x] TASK-C.1 Repo setup: implemented as `certchain-validator/`.
- [x] TASK-C.2 Type definitions: implemented in `validators/certchain.ak`.
- [~] TASK-C.3 Validator logic: mint pair, burn pair, and issuer-signed spend implemented; stricter per-action datum checks are deferred.
- [ ] TASK-C.4 Unit tests: `aiken check` currently reports 0 tests.
- [x] TASK-C.5 Compile + verify output: `aiken build` generates `plutus.json`.
- [~] TASK-C.6 Preprod deployment test: mint and revoke tested; update/burn on-chain tests are deferred.

## Phase D - Integration

- [x] TASK-D.1 Backend V3 mint endpoint: implemented in production mint path.
- [x] TASK-D.2 Frontend datum parsing: verifier reads current CIP-68 inline datum.
- [x] TASK-D.3 Verifier UI update: V3 badge and revoked banner implemented.
- [~] TASK-D.4 Issuer Portal mint version picker: deferred; current production path is V3-focused with V2 verification fallback.
- [x] TASK-D.5 Issuer revoke UI: History revoke flow implemented for V3 credentials.

## Final Production Smoke Tests

- [x] V3 mint succeeds end-to-end.
- [x] V3 revoke succeeds end-to-end.
- [x] Verify revoked credential shows red `CREDENTIAL REVOKED` banner.
- [x] V2 fallback still resolves legacy metadata.
- [x] Production Vercel health check returns HTTP 200.
- [x] Production Vercel logs show no recent revoke errors after the fresh-UTxO fix.

## Deferred To Reach 100% Of Original Plan

- Add Aiken unit tests for minting policy and spend validator behavior.
- Harden `SpendAction::Revoke` on-chain so the validator verifies the new datum
  status is `revoked` and static fields are preserved.
- Harden `SpendAction::Update` on-chain so static fields cannot be changed.
- Add explicit on-chain tests for `Update` and `Burn`.
- Add a V2/V3 mint version picker if both mint standards need to be exposed in
  the same issuer UI.
- Run enough Preprod volume to satisfy the plan's `10+ V3 mints + 5+ revokes`
  success criterion.
