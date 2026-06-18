use cardano/transaction
use vault

const owner_pkh =
  #"11111111111111111111111111111111111111111111111111111111"

const wrong_pkh =
  #"22222222222222222222222222222222222222222222222222222222"

const witness_pkh =
  #"33333333333333333333333333333333333333333333333333333333"

test owner_signature_succeeds() {
  vault.owner_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [owner_pkh],
    },
    owner_pkh,
  )
}

test wrong_signature_fails() {
  !vault.owner_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [wrong_pkh],
    },
    owner_pkh,
  )
}

test no_signature_fails() {
  !vault.owner_signed(transaction.placeholder, owner_pkh)
}

test multiple_signatures_including_owner_succeeds() {
  vault.owner_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [wrong_pkh, owner_pkh, witness_pkh],
    },
    owner_pkh,
  )
}

test owner_missing_from_witness_set_fails() {
  !vault.owner_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [wrong_pkh, witness_pkh],
    },
    owner_pkh,
  )
}
