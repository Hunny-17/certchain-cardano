# CertChain V3 CIP-68 Release Notes

Release date: 2026-06-14

## Status

CertChain V3 is merged to `main` and deployed to production at:

https://certchain-cardano.vercel.app

V3 smart-contract operations remain Preprod-only. Mainnet validator deployment requires an external audit.

## Shipped

- CIP-68 dual-token minting: label-100 Reference NFT and label-222 User NFT.
- Reference NFT locked at the validator address with inline datum.
- Issuer-controlled revocation writes `status = "revoked"` on-chain.
- Verifier reads V3 inline datum and falls back to legacy V2 metadata.
- Issuer Portal supports V3 revoke flow and Revoked/Active badge state.

## Verified On Preprod

| Flow | Result | Tx |
|---|---|---|
| V3 mint | Pass | https://preprod.cardanoscan.io/transaction/e4cae0e69ab553d58b42e0f77ec6435a9dd4d2e9fe7150784b9e5862b77d4ce5 |
| V3 revoke | Pass | https://preprod.cardanoscan.io/transaction/a67728c9e8d79f7e84d39390c74453980931a695f3f9fb7226cf5e2de286348f |
| V2 fallback | Pass | `fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851` |

## Production Checks

- Vercel production deploy: Ready.
- Production `/`: HTTP 200.
- Production `/api/health`: HTTP 200.
- Production `/api/mint/execute` OPTIONS: HTTP 204.
- Production error logs: no recent errors found during post-release check.
- Required V3 env vars are present in Preview and Production.

## Notes

Two runtime fixes were added after Preprod testing:

- Collateral UTxOs are excluded from coin selection so mint/revoke transactions do not accidentally consume them.
- Revoke outputs top up lovelace to avoid `BabbageOutputTooSmallUTxO` when writing the larger revoked datum.
