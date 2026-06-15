# V3 Final Gap Review

Date: 2026-06-15

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
- Revoke endpoint uses fresh custody UTxOs and has passed a production Preprod
  revoke retry.
- Hardened validator reference script deployed on Preprod and passed fresh
  production mint/revoke/verify smoke.
- Revoked verify page shows V3 badge, `DATUM STATUS revoked`, and red banner.
- Release notes record the latest successful mint/revoke/verify smoke test.

## Partial

- Validator actions exist for mint, burn, update, and revoke, but production
  only exercises mint and revoke.
- Hardened spend validator now enforces issuer signature, static-field
  preservation, and `Revoke` datum status transition.
- `aiken check` now reports 25 tests passing.

## Deferred

- Phase A practice projects: vault validator and token swap escrow.
- On-chain tests for `Update` and `Burn`.
- V2/V3 issuer mint version picker.
- Preprod volume target of 10+ V3 mints and 5+ revocations.
- External audit and any Mainnet deployment.

## Release Interpretation

The V3 core release is complete for Preprod demonstration and portfolio use.
The original development plan remains open for audit-grade contract hardening.
