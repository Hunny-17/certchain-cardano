use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}

pub type VaultDatum {
  note: ByteArray,
}

pub type VaultRedeemer {
  Withdraw
}

pub fn owner_signed(self: Transaction, owner: VerificationKeyHash) -> Bool {
  list.has(self.extra_signatories, owner)
}

validator vault(owner: VerificationKeyHash) {
  spend(
    _datum: Option<VaultDatum>,
    redeemer: VaultRedeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    when redeemer is {
      Withdraw -> owner_signed(self, owner)
    }
  }
}
