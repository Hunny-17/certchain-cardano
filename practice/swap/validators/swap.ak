use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{VerificationKey}
use cardano/assets.{PolicyId, has_any_nft, lovelace_of}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use cardano/transaction

pub type SwapDatum {
  seller: VerificationKeyHash,
  price: Int,
  nft_policy: PolicyId,
}

pub type SwapRedeemer {
  Buy { buyer: VerificationKeyHash }
  UpdatePrice { new_price: Int }
  Cancel
}

pub fn valid_datum(datum: SwapDatum) -> Bool {
  datum.price > 0
}

pub fn seller_paid(outputs: List<Output>, seller: VerificationKeyHash, price: Int) -> Bool {
  list.foldl(outputs, 0, fn(output, total) {
    when output.address.payment_credential is {
      VerificationKey(pkh) -> if pkh == seller { total + lovelace_of(output.value) } else { total }
      _ -> total
    }
  }) >= price
}

pub fn nft_sent_to(
  outputs: List<Output>,
  buyer: VerificationKeyHash,
  nft_policy: PolicyId,
) -> Bool {
  list.any(outputs, fn(output) {
    when output.address.payment_credential is {
      VerificationKey(pkh) -> pkh == buyer && has_any_nft(output.value, nft_policy)
      _ -> False
    }
  })
}

pub fn datum_preserved(old: SwapDatum, next: SwapDatum, new_price: Int) -> Bool {
  and {
    new_price > 0,
    old.seller == next.seller,
    old.nft_policy == next.nft_policy,
    next.price == new_price,
  }
}

pub fn signed_by(self: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(self.extra_signatories, pkh)
}

fn inline_datum(output: Output) -> Option<SwapDatum> {
  when output.datum is {
    InlineDatum(data) -> {
      expect datum: SwapDatum = data
      Some(datum)
    }
    _ -> None
  }
}

fn continuing_output(self: Transaction, own_ref: OutputReference) -> Option<Output> {
  let own_input = transaction.resolve_input(self.inputs, own_ref)

  self.outputs
    |> list.find(fn(output) { output.address == own_input.address })
}

validator swap {
  spend(
    datum: Option<SwapDatum>,
    redeemer: SwapRedeemer,
    utxo: OutputReference,
    self: Transaction,
  ) {
    when datum is {
      None -> False
      Some(escrow) -> {
        let own_input = transaction.resolve_input(self.inputs, utxo)

        and {
          valid_datum(escrow),
          has_any_nft(own_input.value, escrow.nft_policy),
          when redeemer is {
            Buy { buyer } -> {
              when continuing_output(self, utxo) is {
                None ->
                  and {
                    signed_by(self, buyer),
                    seller_paid(self.outputs, escrow.seller, escrow.price),
                    nft_sent_to(self.outputs, buyer, escrow.nft_policy),
                  }
                Some(_) -> False
              }
            }

            UpdatePrice { new_price } -> {
              when continuing_output(self, utxo) is {
                None -> False
                Some(output) -> {
                  when inline_datum(output) is {
                    None -> False
                    Some(next) ->
                      and {
                        signed_by(self, escrow.seller),
                        has_any_nft(output.value, escrow.nft_policy),
                        datum_preserved(escrow, next, new_price),
                      }
                  }
                }
              }
            }

            Cancel -> signed_by(self, escrow.seller)
          },
        }
      }
    }
  }
}
