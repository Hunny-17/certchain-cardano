use aiken/collection/list
use cardano/assets
use cardano/transaction
use swap

const seller = #"11111111111111111111111111111111111111111111111111111111"
const buyer = #"22222222222222222222222222222222222222222222222222222222"
const other = #"33333333333333333333333333333333333333333333333333333333"
const nft_policy = #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

fn escrow(price: Int) -> swap.SwapDatum {
  swap.SwapDatum { seller, price, nft_policy }
}

test valid_escrow_requires_positive_price() {
  swap.valid_datum(escrow(3_000_000))
}

test zero_price_is_rejected() {
  !swap.valid_datum(escrow(0))
}

test update_price_preserves_seller_and_policy() {
  swap.datum_preserved(escrow(3_000_000), escrow(4_000_000), 4_000_000)
}

test malicious_seller_change_is_rejected() {
  let tampered = swap.SwapDatum { seller: other, price: 4_000_000, nft_policy }
  !swap.datum_preserved(escrow(3_000_000), tampered, 4_000_000)
}

test malicious_policy_change_is_rejected() {
  let tampered = swap.SwapDatum {
    seller,
    price: 4_000_000,
    nft_policy: #"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  }
  !swap.datum_preserved(escrow(3_000_000), tampered, 4_000_000)
}

test mismatched_new_price_is_rejected() {
  !swap.datum_preserved(escrow(3_000_000), escrow(4_000_000), 5_000_000)
}

test nft_policy_value_contains_an_nft() {
  assets.from_lovelace(2_000_000)
    |> assets.add(nft_policy, "practice-nft", 1)
    |> assets.has_any_nft(nft_policy)
}

test different_policy_does_not_satisfy_nft_check() {
  !(assets.from_lovelace(2_000_000)
    |> assets.add(#"cccccccccccccccccccccccccccccccccccccccccccccccccccccccc", "practice-nft", 1)
    |> assets.has_any_nft(nft_policy))
}

test seller_signature_fixture_is_present() {
  list.has(
    transaction.Transaction { ..transaction.placeholder, extra_signatories: [seller] }.extra_signatories,
    seller,
  )
}

test buyer_signature_is_required_for_purchase() {
  swap.signed_by(
    transaction.Transaction { ..transaction.placeholder, extra_signatories: [buyer] },
    buyer,
  )
}

test missing_buyer_signature_is_rejected() {
  !swap.signed_by(
    transaction.Transaction { ..transaction.placeholder, extra_signatories: [seller] },
    buyer,
  )
}
