use aiken/collection/list
use cardano/address
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

fn nft_value(asset_name: ByteArray) {
  assets.from_lovelace(2_000_000)
    |> assets.add(nft_policy, asset_name, 1)
}

test escrow_token_set_is_preserved_for_the_buyer() {
  swap.preserves_escrow_tokens(nft_value("locked-nft"), nft_value("locked-nft"), nft_policy)
}

test different_nft_under_the_same_policy_is_rejected() {
  !swap.preserves_escrow_tokens(nft_value("locked-nft"), nft_value("decoy-nft"), nft_policy)
}

const escrow_script_hash =
  #"99999999999999999999999999999999999999999999999999999999"

const own_ref = transaction.OutputReference {
  transaction_id: transaction.placeholder.id,
  output_index: 0,
}

fn key_output(pkh, value) -> transaction.Output {
  transaction.Output {
    address: address.from_verification_key(pkh),
    value,
    datum: transaction.NoDatum,
    reference_script: None,
  }
}

fn continuing_output(value, datum) -> transaction.Output {
  transaction.Output {
    address: address.from_script(escrow_script_hash),
    value,
    datum: transaction.InlineDatum(datum),
    reference_script: None,
  }
}

fn escrow_input() -> transaction.Input {
  transaction.Input {
    output_reference: own_ref,
    output: transaction.Output {
      address: address.from_script(escrow_script_hash),
      value: nft_value("locked-nft"),
      datum: transaction.InlineDatum(escrow(3_000_000)),
      reference_script: None,
    },
  }
}

fn buy_transaction(paid: Int, buyer_value, signatories) -> transaction.Transaction {
  transaction.Transaction {
    ..transaction.placeholder,
    inputs: [escrow_input()],
    outputs: [
      key_output(seller, assets.from_lovelace(paid)),
      key_output(buyer, buyer_value),
    ],
    extra_signatories: signatories,
  }
}

fn update_transaction(next, continuation_value) -> transaction.Transaction {
  transaction.Transaction {
    ..transaction.placeholder,
    inputs: [escrow_input()],
    outputs: [continuing_output(continuation_value, next)],
    extra_signatories: [seller],
  }
}

test buy_accepts_exact_escrow_nft_and_price() {
  swap.validate_swap(
    Some(escrow(3_000_000)),
    swap.Buy { buyer },
    own_ref,
    buy_transaction(3_000_000, nft_value("locked-nft"), [buyer]),
  )
}

test buy_rejects_underpayment_in_full_context() {
  !swap.validate_swap(
    Some(escrow(3_000_000)),
    swap.Buy { buyer },
    own_ref,
    buy_transaction(2_000_000, nft_value("locked-nft"), [buyer]),
  )
}

test buy_rejects_missing_buyer_signature_in_full_context() {
  !swap.validate_swap(
    Some(escrow(3_000_000)),
    swap.Buy { buyer },
    own_ref,
    buy_transaction(3_000_000, nft_value("locked-nft"), [seller]),
  )
}

test buy_rejects_same_policy_decoy_nft_in_full_context() {
  !swap.validate_swap(
    Some(escrow(3_000_000)),
    swap.Buy { buyer },
    own_ref,
    buy_transaction(3_000_000, nft_value("decoy-nft"), [buyer]),
  )
}

test update_rejects_same_policy_decoy_nft_in_full_context() {
  !swap.validate_swap(
    Some(escrow(3_000_000)),
    swap.UpdatePrice { new_price: 4_000_000 },
    own_ref,
    update_transaction(escrow(4_000_000), nft_value("decoy-nft")),
  )
}
