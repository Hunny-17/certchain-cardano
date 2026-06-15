# CertChain V3 CIP-68 Design

Status: Preprod production core implemented

This document records the design decisions from `Paperwork/CIP68_DEV_PLAN.md`
against the implementation that is currently deployed on Cardano Preprod.

## Scope

CertChain V3 upgrades credentials from immutable transaction metadata to
CIP-68 dual-token credentials:

- label-100 Reference NFT: locked at the validator address and carries inline datum.
- label-222 User NFT: held by the custody wallet in the current implementation.
- Revocation: issuer spends the Reference NFT and writes a new inline datum with
  `status = "revoked"`.

Mainnet deployment is out of scope until an external audit is complete.

## Authorization

Decision: single issuer signature for V3.0.

The spend validator authorizes Reference NFT updates by checking that the
transaction is signed by `issuer_pkh` from the current datum. This keeps the
contract small and matches the current custody-wallet issuance model.

Deferred: multi-sig or token-gated governance for V3.1+.

## Datum Schema

Current on-chain datum:

| Field | Type | Mutable | Notes |
|---|---|---:|---|
| `name` | `ByteArray` | no | Credential title. |
| `image` | `ByteArray` | yes | IPFS URI or placeholder. |
| `issuer` | `ByteArray` | no | Institution name. |
| `issuer_pkh` | `VerificationKeyHash` | no | Required signer for updates/revocation. |
| `issue_date` | `ByteArray` | no | `YYYY-MM-DD`. |
| `cert_type` | `ByteArray` | no | Diploma, certificate, etc. |
| `recipient_name` | `ByteArray` | no | Display recipient name. |
| `status` | `ByteArray` | yes | `"active"` or `"revoked"`. |

Datum encoding is mirrored in `frontend/api/_lib/cip68-datum.ts`.

## Actions

Current validator actions:

- `MintAction::IssueCert`: mints paired label-100 and label-222 tokens.
- `MintAction::BurnCert`: burns matching token pairs.
- `SpendAction::Update`: issuer-signed Reference NFT spend.
- `SpendAction::Revoke`: issuer-signed Reference NFT spend.

Current production backend uses `IssueCert` and `Revoke`.

The spend validator checks issuer signature and the continuing output datum.
`SpendAction::Revoke` requires static fields to be preserved and the new datum
status to be `revoked`. `SpendAction::Update` requires static fields to be
preserved.

## Migration

Decision: V2 and V3 coexist.

- V2 credentials remain immutable and continue to verify through the legacy
  metadata path.
- V3 credentials are forward-only and support issuer revocation.
- The verifier attempts V3 current datum resolution and retains V2 fallback.
- V2 credentials are not retrofitted into V3.

## Cost And Optimization

Current optimization choices:

- Reference script deployed once on Preprod.
- Inline datum kept compact.
- Single validator handles mint and spend paths.
- Revoke uses fresh custody UTxOs from Blockfrost to avoid warm serverless
  wallet-cache stale inputs.

## Verified Preprod Transactions

| Flow | Tx |
|---|---|
| V3 mint smoke test | `e4cae0e69ab553d58b42e0f77ec6435a9dd4d2e9fe7150784b9e5862b77d4ce5` |
| V3 revoke smoke test | `a67728c9e8d79f7e84d39390c74453980931a695f3f9fb7226cf5e2de286348f` |
| Hardened reference script deploy | `55465fe31e313a7f9ec04f0cd5082fee272177baa0e65645d6f756ef79df95b9` |
| Production revoke retry | `01fac413e0d146c76d6ff42c5c1826a57b9aa9140b28a386a39b479358670ff8` |
| V2 fallback check | `fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851` |
