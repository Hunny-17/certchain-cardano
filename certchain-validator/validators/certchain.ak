use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/assets.{PolicyId, tokens}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use cardano/transaction

// CIP-68 label-100 prefix: Reference NFT (holds metadata in datum, locked at script)
const label_100: ByteArray = #"000643b0"

// CIP-68 label-222 prefix: User NFT (ownership token, held by credential holder)
const label_222: ByteArray = #"000de140"

pub type CertDatum {
  name: ByteArray,
  image: ByteArray,
  issuer: ByteArray,
  issuer_pkh: VerificationKeyHash,
  issue_date: ByteArray,
  cert_type: ByteArray,
  recipient_name: ByteArray,
  // "active" | "revoked"
  status: ByteArray,
}

pub type MintAction {
  // Issue a new credential: mints label-100 + label-222 pair
  IssueCert
  // Burn both tokens (full revocation path)
  BurnCert
}

pub type SpendAction {
  // Spend the reference NFT to update datum fields (e.g. correct an error)
  Update
  // Spend the reference NFT to set status = "revoked"
  Revoke
}

pub fn issuer_signed(self: Transaction, issuer_pkh: VerificationKeyHash) -> Bool {
  list.has(self.extra_signatories, issuer_pkh)
}

pub fn static_fields_preserved(old: CertDatum, new: CertDatum) -> Bool {
  and {
    old.name == new.name,
    old.issuer == new.issuer,
    old.issuer_pkh == new.issuer_pkh,
    old.issue_date == new.issue_date,
    old.cert_type == new.cert_type,
    old.recipient_name == new.recipient_name,
  }
}

pub fn is_revoked(cert: CertDatum) -> Bool {
  cert.status == "revoked"
}

fn output_datum(output: Output) -> Option<CertDatum> {
  when output.datum is {
    InlineDatum(data) -> {
      expect cert: CertDatum = data
      Some(cert)
    }
    _ -> None
  }
}

fn continuing_datum(self: Transaction, own_ref: OutputReference) -> Option<CertDatum> {
  let own_input = transaction.resolve_input(self.inputs, own_ref)

  self.outputs
    |> list.find_map(fn(output) {
        if output.address == own_input.address {
          output_datum(output)
        } else {
          None
        }
      })
}

pub fn validate_spend_action(
  old: CertDatum,
  action: SpendAction,
  new: CertDatum,
) -> Bool {
  when action is {
    Update ->
      static_fields_preserved(old, new)

    Revoke ->
      and {
        static_fields_preserved(old, new),
        is_revoked(new),
      }
  }
}

validator certchain {
  // Minting policy — enforces CIP-68 paired issuance.
  // IssueCert: must mint exactly one label-100 and one label-222 per base name.
  // BurnCert:  must burn tokens in matching pairs.
  mint(action: MintAction, policy_id: PolicyId, self: Transaction) {
    let minted = tokens(self.mint, policy_id)
    let names = dict.keys(minted)

    let ref_names =
      list.filter(names, fn(n) { bytearray.take(n, 4) == label_100 })

    let user_names =
      list.filter(names, fn(n) { bytearray.take(n, 4) == label_222 })

    when action is {
      IssueCert ->
        and {
          list.length(ref_names) > 0,
          list.length(ref_names) == list.length(user_names),
          // Every reference NFT must have a matching user NFT (same base name), both qty = 1
          list.all(
            ref_names,
            fn(rn) {
              let base = bytearray.drop(rn, 4)
              let un = bytearray.concat(label_222, base)
              and {
                list.has(user_names, un),
                dict.get(minted, rn) == Some(1),
                dict.get(minted, un) == Some(1),
              }
            },
          ),
        }

      BurnCert ->
        and {
          // All quantities must be negative (burning)
          list.all(
            names,
            fn(n) {
              when dict.get(minted, n) is {
                Some(qty) -> qty < 0
                None -> False
              }
            },
          ),
          // Burns must be paired: every label-100 burn has a matching label-222 burn
          list.all(
            ref_names,
            fn(rn) {
              let base = bytearray.drop(rn, 4)
              list.has(user_names, bytearray.concat(label_222, base))
            },
          ),
        }
    }
  }

  // Spend validator — guards the reference NFT UTxO (label-100 token).
  // Only the original issuing university (identified by issuer_pkh in datum)
  // may spend this UTxO, whether to update metadata or revoke the credential.
  spend(
    datum: Option<CertDatum>,
    action: SpendAction,
    utxo: OutputReference,
    self: Transaction,
  ) {
    when datum is {
      None -> False
      Some(cert) -> {
        when continuing_datum(self, utxo) is {
          None -> False
          Some(new_cert) ->
            and {
              issuer_signed(self, cert.issuer_pkh),
              validate_spend_action(cert, action, new_cert),
            }
        }
      }
    }
  }
}
