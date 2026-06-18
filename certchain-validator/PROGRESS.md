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
- [x] TASK-C.3 Validator logic: mint pair, burn pair, issuer-signed spend, static-field preservation, and revoke status transition implemented.
- [x] TASK-C.4 Unit tests: `aiken check` reports 25 tests passing.
- [x] TASK-C.5 Compile + verify output: `aiken build` generates `plutus.json`; hardened script hash is `849a42464f285ca3e67e03d2fd974b497831a6ace8c11e1b85238f58`.
- [x] TASK-C.6 Preprod deployment test: hardened reference script deployed and fresh mint/revoke/verify smoke passed.

## Phase D - Integration

- [x] TASK-D.1 Backend V3 mint endpoint: implemented in production mint path and exposed as `/api/mint/execute-v3`.
- [x] TASK-D.2 Frontend datum parsing: verifier reads current CIP-68 inline datum.
- [x] TASK-D.3 Verifier UI update: V3 badge and revoked banner implemented.
- [x] TASK-D.4 Issuer Portal mint version picker: V2/V3 picker implemented, default V2, cost estimates shown, history shows version per record.
- [x] TASK-D.5 Issuer revoke UI: History revoke flow implemented for V3 credentials.

## Final Production Smoke Tests

- [x] V3 mint succeeds end-to-end.
- [x] V3 revoke succeeds end-to-end.
- [x] Verify revoked credential shows red `CREDENTIAL REVOKED` banner.
- [x] V2 fallback still resolves legacy metadata.
- [x] Production Vercel health check returns HTTP 200.
- [x] Production Vercel logs show no recent revoke errors after the fresh-UTxO fix.
- [x] Preprod volume target met: audit log confirms 14 V3 mint successes and
  5 V3 revoke successes.
- [x] UpdateMetadata on-chain test passed:
  - Mint tx `e159f2af4183c77eaea0fe8d0233caf5eaf7125b85c8a4b366ff1ef9934941cd`
  - Update tx `c1bf45062b0671027df7c91359e044f1307eca9d1c0db927fa5aa54159adaa0b`
- [x] Hardened validator smoke:
  - Mint tx `56638b322f0165a0cbf12ac8b58968e607f0a9e4a48bd8b39c7e03793593bb88`
  - Revoke tx `691bb7551636bf993226c4c3cb78886145fc721d74005dba3aebc91ed7943fdb`

## Deferred To Reach 100% Of Original Plan

- Add explicit on-chain test for `Burn`.
