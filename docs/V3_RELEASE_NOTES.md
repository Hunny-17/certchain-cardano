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
- Issuer Portal supports a V2/V3 mint version picker with V2 default, V3
  revocable mode, per-version cost estimates, and version display in History.

## Verified On Preprod

| Flow | Result | Tx |
|---|---|---|
| V3 mint | Pass | https://preprod.cardanoscan.io/transaction/e4cae0e69ab553d58b42e0f77ec6435a9dd4d2e9fe7150784b9e5862b77d4ce5 |
| V3 revoke | Pass | https://preprod.cardanoscan.io/transaction/a67728c9e8d79f7e84d39390c74453980931a695f3f9fb7226cf5e2de286348f |
| V3 production revoke retry | Pass | https://preprod.cardanoscan.io/transaction/01fac413e0d146c76d6ff42c5c1826a57b9aa9140b28a386a39b479358670ff8 |
| V3 hardened validator mint | Pass | https://preprod.cardanoscan.io/transaction/56638b322f0165a0cbf12ac8b58968e607f0a9e4a48bd8b39c7e03793593bb88 |
| V3 hardened validator revoke | Pass | https://preprod.cardanoscan.io/transaction/691bb7551636bf993226c4c3cb78886145fc721d74005dba3aebc91ed7943fdb |
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
- Issuer History hydrates from Supabase so V3 credentials keep their `asset_id` even when browser `localStorage` is stale or missing fields.
- Revoke fetches fresh custody UTxOs from Blockfrost at request time so warm serverless invocations do not reuse stale wallet inputs.
- The hardened validator now enforces static-field preservation and requires `status = "revoked"` for `SpendAction::Revoke`; `aiken check` reports 25 tests passing.
- V2 minting is available through `/api/mint/execute-v2`; V3 minting is
  explicitly available through `/api/mint/execute-v3` while `/api/mint/execute`
  remains the deployed compatibility route.

Latest production smoke test:

- Mint tx: `56638b322f0165a0cbf12ac8b58968e607f0a9e4a48bd8b39c7e03793593bb88`
- Revoke tx: `691bb7551636bf993226c4c3cb78886145fc721d74005dba3aebc91ed7943fdb`
- Verify result: V3 badge shown, datum status `revoked`, red `CREDENTIAL REVOKED` banner shown.
