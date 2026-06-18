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
- [x] TASK-C.4 Unit tests: `aiken check` reports 26 tests passing.
- [x] TASK-C.5 Compile + verify output: `aiken build` generates `plutus.json`; burn-enabled script hash is `b12bf31164f1290f7c7d67471422dd2932ac4f90cbaa9291d65ebeda`.
- [x] TASK-C.6 Preprod deployment test: burn-enabled reference script deployed and fresh mint/update/revoke/burn smoke passed.

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
- [x] Burn on-chain test passed:
  - Reference script deploy tx `5b31c9befbed9c79eec2dbb132705a08f64f317b0cc501a787a482590623c91f`
  - Mint tx `1422bdf8f0aa16f86ea5aae3db95b2ac8033c38384908c81b212fbda560a96a1`
  - Burn tx `21f15b723d5dc32afd80c334a8ec6a22aaa54e8f6e497dd1c879f9ed31468cef`
  - Post-burn Blockfrost check: reference NFT UTxO at script address returned `[]`
- [x] Hardened validator smoke:
  - Mint tx `56638b322f0165a0cbf12ac8b58968e607f0a9e4a48bd8b39c7e03793593bb88`
  - Revoke tx `691bb7551636bf993226c4c3cb78886145fc721d74005dba3aebc91ed7943fdb`

## Remaining Outside Repo Production Scope

- Phase A learning/practice projects remain self-study items, not production repo deliverables.
- External audit and any Mainnet deployment remain deferred.
