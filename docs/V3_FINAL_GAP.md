# V3 Final Gap Review

Date: 2026-06-18

`Paperwork/CIP68_DEV_PLAN.md` is broader than the V3 core that is currently
deployed. The current system is Preprod production-ready for the main CIP-68
mint/verify/revoke workflow, but not yet complete against every hardening item
in the original plan.

## Complete

- CIP-68 label-100 Reference NFT and label-222 User NFT minting.
- Reference NFT locked at validator address with inline datum.
- V3 verifier reads the current Reference NFT datum from the script address.
- V2 metadata verification remains backward compatible.
- Issuer History hydrates V3 credentials from Supabase so `asset_id` is present.
- Issuer can revoke V3 credentials from History.
- Issuer Portal has a V2/V3 mint version picker with V2 default, cost estimates,
  explicit `/api/mint/execute-v2` and `/api/mint/execute-v3` routing, and
  version display in History.
- Revoke endpoint uses fresh custody UTxOs and has passed a production Preprod
  revoke retry.
- Burn-enabled validator reference script deployed on Preprod and passed fresh
  production mint/burn smoke.
- Preprod volume target met: audit log confirms 14 V3 mint successes and 5 V3
  revoke successes.
- UpdateMetadata on-chain test passed: reference datum moved to update tx
  `c1bf45062b0671027df7c91359e044f1307eca9d1c0db927fa5aa54159adaa0b` while
  status remained `active`.
- Burn on-chain test passed: mint tx
  `1422bdf8f0aa16f86ea5aae3db95b2ac8033c38384908c81b212fbda560a96a1`, burn tx
  `21f15b723d5dc32afd80c334a8ec6a22aaa54e8f6e497dd1c879f9ed31468cef`, and the
  reference NFT UTxO query at the script address returned an empty array.
- Revoked verify page shows V3 badge, `DATUM STATUS revoked`, and red banner.
- Release notes record the latest successful mint/revoke/verify smoke test.

## Validator Coverage

- Validator actions exist for mint, burn, update, and revoke; production has
  exercised mint, update, revoke, and burn on Preprod.
- Hardened spend validator now enforces issuer signature, static-field
  preservation, `Revoke` datum status transition, and the no-continuing-output
  burn path.
- `aiken check` now reports 26 tests passing.

## Deferred

- Phase A practice projects: vault validator and token swap escrow.
- External audit and any Mainnet deployment.

## Release Interpretation

The V3 core release is complete for Preprod demonstration and portfolio use.
The original development plan remains open only for learning-practice items and
audit/Mainnet readiness.
