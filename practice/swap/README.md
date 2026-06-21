# Token Swap Escrow Practice

Phase A.5 practice project from `Paperwork/CIP68_DEV_PLAN.md`.

## Goal

Alice locks a dedicated NFT in a Plutus V3 escrow. Bob can buy it only by
signing the transaction, paying the listed lovelace price to Alice, and taking
the NFT to Bob's payment address.

## Datum And Redeemer

```aiken
SwapDatum { seller, price, nft_policy }
SwapRedeemer { Buy { buyer }, UpdatePrice { new_price }, Cancel }
```

- `Buy` requires the buyer signature, the seller payment, an NFT from the
datum policy at the buyer address, and no continuing escrow output.
- `UpdatePrice` requires the seller signature and a continuing output whose
seller and NFT policy are unchanged. Only the positive price may change.
- `Cancel` lets the seller recover the NFT.

## Tests

`aiken check` passes 11 unit tests covering positive prices, NFT policy
matching, datum tampering, price updates, and buyer-signature authorization.

```powershell
aiken check
aiken build
```

## Preprod Validation

- Dedicated native-policy NFT mint:
  `47248675b3a57453b0426a8e39e420781375ed87aaea736a78126df9acfc564f`.
- Initial escrow lock:
  `65983a3f17e41290554fed585d7f36f4e93597971a7308101eef3b0af58bb5cc`.
- Final corrected escrow lock:
  `cc4c24eff6aeb5a0ae1884169c5d2e22bdc4f817f4aa63110ab8db702ab2c9d2`.
- Buyer-funded 2 ADA attempt against a 3 ADA datum was rejected by the Plutus
validator. The node did not assign a transaction id because submission failed.
- Buyer-funded 3 ADA purchase succeeded:
  `5a52af0e2ec30fbb55953bfa56ea09d8d0623173d8d00b1fd1945ada94411bdc`.
  It spent the final escrow UTxO and sent the NFT to the separate buyer address.

## Scripts

```powershell
node scripts/mint-test-nft.mjs task-a5-example
node scripts/fund-buyer.mjs 10000000
node scripts/lock-swap.mjs <asset-unit> 3000000
node scripts/buy-swap.mjs <lock-tx-hash> 0 3000000
```

## What We Learned

The first live purchase exposed a real two-party authorization gap: allowing
the seller to submit `Buy` meant a seller change output could satisfy the
payment check. The final validator requires the buyer signature and the final
Preprod flow uses a separate, funded buyer key. This is why the negative
underpayment test reaches the validator and fails before the correct purchase
is submitted.

The purchase runner uses an explicit bounded Plutus V3 execution budget. This
avoids a small Blockfrost evaluator underestimation observed on Preprod.
