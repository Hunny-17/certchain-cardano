/**
 * api/_lib/cip68-datum.ts
 * CIP-68 asset name builders and CertDatum constructor.
 *
 * CIP-68 label prefixes (4-byte, big-endian):
 *   label 100 → 0x000643b0  Reference NFT (locked at validator, holds datum)
 *   label 222 → 0x000de140  User NFT (sent to holder, represents ownership)
 */

import { mConStr0 } from "@meshsdk/core";

// ─── CIP-68 label prefixes ─────────────────────────────────────────
export const CIP68_LABEL_100 = "000643b0"; // Reference NFT
export const CIP68_LABEL_222 = "000de140"; // User / ownership NFT

// ─── Asset name helpers ────────────────────────────────────────────

/** Convert a UTF-8 string to hex. */
function toHex(s: string): string {
  return Buffer.from(s, "utf-8").toString("hex");
}

/**
 * Given a UTF-8 base name (e.g. "CERTLKHJ4F9A2B"), return the hex-encoded
 * CIP-68 asset names for both the reference NFT and the user NFT.
 *
 * Total asset name length must be ≤ 32 bytes (64 hex chars).
 * Base name must therefore be ≤ 28 bytes (label prefix takes 4 bytes).
 */
export function buildCip68AssetNames(baseNameStr: string): {
  refAssetName: string;   // hex, label-100 + base
  userAssetName: string;  // hex, label-222 + base
  baseNameHex: string;
} {
  const baseNameHex = toHex(baseNameStr);
  if (baseNameHex.length > 56) {
    // 28 bytes = 56 hex chars (32 byte max - 4 byte prefix)
    throw new Error(`CIP-68 base name too long: ${baseNameStr} (must be ≤ 28 bytes)`);
  }
  return {
    refAssetName:  CIP68_LABEL_100 + baseNameHex,
    userAssetName: CIP68_LABEL_222 + baseNameHex,
    baseNameHex,
  };
}

// ─── Datum builder ─────────────────────────────────────────────────

export interface CertDatumParams {
  name: string;          // credential title
  image: string;         // ipfs:// URI or placeholder
  issuer: string;        // institution name
  issuerPkh: string;     // custody wallet payment key hash (hex, 28 bytes)
  issueDate: string;     // YYYY-MM-DD
  certType: string;      // e.g. "credential", "degree"
  recipientName: string;
  status?: string;       // default "active"
}

/**
 * Build the on-chain CertDatum as a Mesh Data object (mConStr0).
 *
 * Matches the Aiken type:
 *   pub type CertDatum {
 *     name, image, issuer, issuer_pkh,
 *     issue_date, cert_type, recipient_name, status
 *   }
 *
 * All ByteArray fields are passed as hex strings in Mesh Data format.
 */
export function buildCertDatum(params: CertDatumParams) {
  const {
    name, image, issuer, issuerPkh,
    issueDate, certType, recipientName,
    status = "active",
  } = params;

  return mConStr0([
    toHex(name),
    toHex(image),
    toHex(issuer),
    issuerPkh,        // already hex (payment key hash)
    toHex(issueDate),
    toHex(certType),
    toHex(recipientName),
    toHex(status),
  ]);
}
