use cardano/transaction
use certchain

const issuer_pkh =
  #"11111111111111111111111111111111111111111111111111111111"

const other_pkh =
  #"22222222222222222222222222222222222222222222222222222222"

fn cert(status: ByteArray) -> certchain.CertDatum {
  certchain.CertDatum {
    name: "Bachelor of Accounting",
    image: "ipfs://cert",
    issuer: "Test University",
    issuer_pkh,
    issue_date: "2026-06-14",
    cert_type: "Diploma",
    recipient_name: "Cao Van D",
    status,
  }
}

fn cert_with_name(name: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, name }
}

fn cert_with_issuer(issuer: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, issuer }
}

fn cert_with_image(image: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, image }
}

fn cert_with_issuer_pkh(issuer_pkh) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, issuer_pkh }
}

fn cert_with_issue_date(issue_date: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, issue_date }
}

fn cert_with_type(cert_type: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, cert_type }
}

fn cert_with_recipient(recipient_name: ByteArray) -> certchain.CertDatum {
  let base = cert("active")
  certchain.CertDatum { ..base, recipient_name }
}

test issuer_signature_is_accepted() {
  certchain.issuer_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [issuer_pkh],
    },
    issuer_pkh,
  )
}

test wrong_signature_is_rejected() {
  !certchain.issuer_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [other_pkh],
    },
    issuer_pkh,
  )
}

test missing_signature_is_rejected() {
  !certchain.issuer_signed(transaction.placeholder, issuer_pkh)
}

test multiple_signatures_including_issuer_are_accepted() {
  certchain.issuer_signed(
    transaction.Transaction {
      ..transaction.placeholder,
      extra_signatories: [other_pkh, issuer_pkh],
    },
    issuer_pkh,
  )
}

test active_status_is_not_revoked() {
  !certchain.is_revoked(cert("active"))
}

test revoked_status_is_revoked() {
  certchain.is_revoked(cert("revoked"))
}

test revoked_status_is_case_sensitive() {
  !certchain.is_revoked(cert("Revoked"))
}

test empty_status_is_not_revoked() {
  !certchain.is_revoked(cert(""))
}

test static_fields_preserved_when_only_status_changes() {
  certchain.static_fields_preserved(cert("active"), cert("revoked"))
}

test static_fields_preserved_when_image_changes() {
  certchain.static_fields_preserved(cert("active"), cert_with_image("ipfs://new"))
}

test static_name_change_rejected() {
  !certchain.static_fields_preserved(cert("active"), cert_with_name("Changed"))
}

test static_issuer_change_rejected() {
  !certchain.static_fields_preserved(
    cert("active"),
    cert_with_issuer("Other University"),
  )
}

test static_issuer_pkh_change_rejected() {
  !certchain.static_fields_preserved(
    cert("active"),
    cert_with_issuer_pkh(other_pkh),
  )
}

test static_issue_date_change_rejected() {
  !certchain.static_fields_preserved(
    cert("active"),
    cert_with_issue_date("2026-06-15"),
  )
}

test static_cert_type_change_rejected() {
  !certchain.static_fields_preserved(cert("active"), cert_with_type("Award"))
}

test static_recipient_change_rejected() {
  !certchain.static_fields_preserved(
    cert("active"),
    cert_with_recipient("Other Student"),
  )
}

test revoke_accepts_preserved_static_fields_and_revoked_status() {
  certchain.validate_spend_action(
    cert("active"),
    certchain.Revoke,
    cert("revoked"),
  )
}

test revoke_rejects_active_status() {
  !certchain.validate_spend_action(
    cert("active"),
    certchain.Revoke,
    cert("active"),
  )
}

test revoke_rejects_empty_status() {
  !certchain.validate_spend_action(
    cert("active"),
    certchain.Revoke,
    cert(""),
  )
}

test revoke_accepts_image_change_with_revoked_status() {
  let next = certchain.CertDatum { ..cert_with_image("ipfs://new"), status: "revoked" }
  certchain.validate_spend_action(cert("active"), certchain.Revoke, next)
}

test revoke_rejects_changed_static_field() {
  !certchain.validate_spend_action(
    cert("active"),
    certchain.Revoke,
    cert_with_name("Changed"),
  )
}

test update_accepts_preserved_static_fields() {
  certchain.validate_spend_action(cert("active"), certchain.Update, cert("active"))
}

test update_accepts_image_change() {
  certchain.validate_spend_action(
    cert("active"),
    certchain.Update,
    cert_with_image("ipfs://new"),
  )
}

test update_accepts_status_change() {
  certchain.validate_spend_action(cert("active"), certchain.Update, cert("revoked"))
}

test update_rejects_changed_static_field() {
  !certchain.validate_spend_action(
    cert("active"),
    certchain.Update,
    cert_with_type("Award"),
  )
}

test burn_is_handled_outside_continuing_datum_validation() {
  !certchain.validate_spend_action(cert("active"), certchain.Burn, cert("active"))
}
