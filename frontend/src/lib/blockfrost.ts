const BLOCKFROST_BASE = 'https://cardano-preprod.blockfrost.io/api/v0'
const API_KEY = import.meta.env.VITE_BLOCKFROST_KEY as string

// V3 CIP-68 config — read at module load so tree-shaking keeps them as constants
const V3_POLICY_ID = (import.meta.env.VITE_POLICY_ID as string | undefined) ?? ''
const V3_SCRIPT_ADDRESS = (import.meta.env.VITE_SCRIPT_ADDRESS as string | undefined) ?? ''
const CIP68_LABEL_100 = '000643b0' // Reference NFT prefix

export interface CertChainMetadata {
  msg?: string[]
  issuer?: {
    id?: string
    name?: string
    pubkey_hash?: string
  }
  credential?: {
    type?: string
    student_id_hash?: string
    name_hash?: string
    major?: string
    gpa?: string
    graduation_date?: string
    doc_hash?: string
  }
  signature?: string
  // V2 NFT-style metadata fields (parsed from CIP-25 label 721)
  asset_name?: string
  image?: string
  cert_type?: string
  claim_hash?: string
  policy_id?: string
  recipient_name?: string
  // V3 CIP-68 fields
  status?: string   // "active" | "revoked"
  version?: 'v2' | 'v3'
}

export interface VerificationResult {
  txHash: string
  isCertChain: boolean
  metadata: CertChainMetadata | null
  blockTime?: number
  blockHeight?: number
  error?: string
}

// ============================================================================
// V3 CIP-68 inline datum parser
// ----------------------------------------------------------------------------
// The datum is mConStr0([name, image, issuer, issuerPkh, issueDate, certType,
//                        recipientName, status]) where all fields are ByteArrays.
// On-chain CBOR: tag-121 (0xd879) + definite array of bytes items.
// ============================================================================

/**
 * Parse a Plutus ConStr0-of-ByteArrays datum from its CBOR hex string.
 * Field 3 (issuerPkh) is raw 28-byte binary and is returned as empty string.
 */
function parsePlutusConStr0Bytes(cborHex: string): string[] | null {
  try {
    const hex = cborHex.replace(/^0x/, '')
    const bytes = new Uint8Array(
      (hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16))
    )
    let pos = 0
    const read = () => bytes[pos++]

    // CBOR tag 121 = 0xd8 0x79 (Plutus Constructor 0)
    if (read() !== 0xd8 || read() !== 0x79) return null

    // Array header — major type 4, either definite or indefinite (Plutus uses 0x9f)
    const arrayHead = read()
    if ((arrayHead >> 5) !== 4) return null
    const ai = arrayHead & 0x1f
    const indefinite = ai === 31 // 0x9f = indefinite-length array
    let count = 0
    if (!indefinite) {
      if (ai <= 23) {
        count = ai
      } else if (ai === 24) {
        count = read()
      } else {
        return null
      }
    }

    const fields: string[] = []
    let idx = 0
    while (indefinite ? bytes[pos] !== 0xff : idx < count) {
      if (indefinite && bytes[pos] === 0xff) break
      const typeHead = read()
      const mt = typeHead >> 5
      if (mt !== 2) return null // expect major type 2 (bytes)
      const lenAi = typeHead & 0x1f
      let len: number
      if (lenAi <= 23) {
        len = lenAi
      } else if (lenAi === 24) {
        len = read()
      } else if (lenAi === 25) {
        len = (read() << 8) | read()
      } else {
        return null
      }
      const fieldBytes = bytes.slice(pos, pos + len)
      pos += len
      // issuerPkh (field 3) is raw binary — skip decoding
      fields.push(idx === 3 ? '' : new TextDecoder().decode(fieldBytes))
      idx++
    }

    return fields.length >= 8 ? fields : null
  } catch {
    return null
  }
}

/**
 * Detect and parse a V3 CIP-68 credential.
 * The mint tx identifies the label-100 Reference NFT, then we fetch the current
 * UTxO for that asset so revoked credentials don't show stale mint-time datum.
 * Returns null if the tx is not a V3 CertChain mint.
 */
async function tryReadV3Datum(txHash: string): Promise<{
  metadata: CertChainMetadata
  isCertChain: true
} | null> {
  if (!V3_POLICY_ID || !V3_SCRIPT_ADDRESS) return null

  const res = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}/utxos`, {
    headers: { project_id: API_KEY },
  })
  if (!res.ok) return null

  const data = await res.json()
  const outputs: Array<{
    address: string
    amount: Array<{ unit: string; quantity: string }>
    inline_datum: string | null
  }> = Array.isArray(data.outputs) ? data.outputs : []

  // Find the mint output at the script address holding the label-100 reference NFT.
  // Do not parse this datum for status: it is historical once the NFT is updated.
  const scriptOutput = outputs.find(
    (o) =>
      o.address === V3_SCRIPT_ADDRESS &&
      o.amount.some((a) => a.unit.startsWith(V3_POLICY_ID + CIP68_LABEL_100))
  )
  const refAssetId = scriptOutput?.amount.find((a) =>
    a.unit.startsWith(V3_POLICY_ID + CIP68_LABEL_100)
  )?.unit
  if (!refAssetId) return null

  const currentRes = await fetch(
    `${BLOCKFROST_BASE}/addresses/${V3_SCRIPT_ADDRESS}/utxos/${refAssetId}`,
    { headers: { project_id: API_KEY } }
  )
  if (!currentRes.ok) return null

  const currentUtxos: Array<{ inline_datum: string | null }> = await currentRes.json()
  const currentRefUtxo = Array.isArray(currentUtxos) ? currentUtxos[0] : null
  if (!currentRefUtxo?.inline_datum) return null

  // fields: [name, image, issuer, issuerPkh(skip), issueDate, certType, recipientName, status]
  const fields = parsePlutusConStr0Bytes(currentRefUtxo.inline_datum)
  if (!fields) return null

  const [name, image, issuer, , issueDate, certType, recipientName, status] = fields

  return {
    isCertChain: true,
    metadata: {
      version: 'v3',
      image: image || undefined,
      cert_type: certType || undefined,
      recipient_name: recipientName || undefined,
      status: status || undefined,
      credential: {
        major: name || undefined,
        type: certType || undefined,
        graduation_date: issueDate || undefined,
      },
      issuer: issuer ? { name: issuer } : undefined,
    },
  }
}

// ============================================================================
// V2 parser — extracts CertChain fields from CIP-25 NFT metadata (label 721)
// ----------------------------------------------------------------------------
// V2 mint format:
//   {
//     "policy_id_hex": {
//       "asset_name_hex": {
//         "name": "BACHELOR OF COMPUTER SCIENCE",
//         "image": "ipfs://...",
//         "cert_type": "Diploma",
//         ...other fields...
//       }
//     }
//   }
// ============================================================================
function parseCip25(label721Json: unknown): Partial<CertChainMetadata> | null {
  if (!label721Json || typeof label721Json !== 'object') return null

  // First key is policy_id
  const policyEntries = Object.entries(label721Json as Record<string, unknown>)
  if (policyEntries.length === 0) return null

  const [policyId, assetsObj] = policyEntries[0]
  if (!assetsObj || typeof assetsObj !== 'object') return null

  // First key is asset_name
  const assetEntries = Object.entries(assetsObj as Record<string, unknown>)
  if (assetEntries.length === 0) return null

  const [assetName, certData] = assetEntries[0]
  if (!certData || typeof certData !== 'object') return null

  const cert = certData as Record<string, unknown>

  return {
    policy_id: policyId,
    asset_name: assetName,
    image: typeof cert.name === 'string' ? undefined : (cert.image as string | undefined),
    cert_type: cert.cert_type as string | undefined,
    credential: {
      major: cert.name as string | undefined,
      type: cert.cert_type as string | undefined,
      graduation_date: cert.issue_date as string | undefined,
    },
    issuer: cert.institution
      ? { name: cert.institution as string }
      : undefined,
    recipient_name: cert.recipient_name as string | undefined,
  }
}

// ============================================================================
// V2 parser — extracts info from CIP-20 message metadata (label 674)
// ----------------------------------------------------------------------------
// V2 mint format:
//   { "msg": ["CertChain v2 credential", "claim_hash:abc123", "issuer:addr_..."] }
// ============================================================================
function parseCip20Msg(label674Json: unknown): Partial<CertChainMetadata> | null {
  if (!label674Json || typeof label674Json !== 'object') return null

  const obj = label674Json as { msg?: unknown }
  if (!Array.isArray(obj.msg)) return null

  const msgs = obj.msg as string[]
  const result: Partial<CertChainMetadata> = { msg: msgs }

  for (const m of msgs) {
    if (typeof m !== 'string') continue
    if (m.startsWith('claim_hash:')) {
      result.claim_hash = m.slice('claim_hash:'.length).trim()
    } else if (m.startsWith('issuer:')) {
      const issuerId = m.slice('issuer:'.length).trim()
      result.issuer = { id: issuerId, name: issuerId }
    }
  }

  return result
}

export async function verifyTxHash(txHash: string): Promise<VerificationResult> {
  if (!API_KEY) {
    return {
      txHash,
      isCertChain: false,
      metadata: null,
      error: 'Thiếu VITE_BLOCKFROST_KEY trong file .env',
    }
  }

  const cleanHash = txHash.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(cleanHash)) {
    return {
      txHash: cleanHash,
      isCertChain: false,
      metadata: null,
      error: 'TxHash không hợp lệ — phải đúng 64 ký tự hex',
    }
  }

  try {
    const txRes = await fetch(`${BLOCKFROST_BASE}/txs/${cleanHash}`, {
      headers: { project_id: API_KEY },
    })

    if (txRes.status === 404) {
      return {
        txHash: cleanHash,
        isCertChain: false,
        metadata: null,
        error: 'Không tìm thấy transaction trên Cardano Preprod',
      }
    }
    if (!txRes.ok) {
      return {
        txHash: cleanHash,
        isCertChain: false,
        metadata: null,
        error: `Blockfrost lỗi: ${txRes.status}`,
      }
    }
    const txInfo = await txRes.json()

    // Fire V3 UTxO check and V2 metadata fetch in parallel
    const [v3Result, metaArray] = await Promise.all([
      tryReadV3Datum(cleanHash).catch(() => null),
      fetch(`${BLOCKFROST_BASE}/txs/${cleanHash}/metadata`, {
        headers: { project_id: API_KEY },
      }).then((r) => r.json()).catch(() => []),
    ])

    // V3 path — inline datum found at script address
    if (v3Result) {
      return {
        txHash: cleanHash,
        isCertChain: true,
        metadata: v3Result.metadata,
        blockTime: txInfo.block_time,
        blockHeight: txInfo.block_height,
      }
    }

    // V2 path — CIP-25 / CIP-20 tx metadata
    if (!Array.isArray(metaArray) || metaArray.length === 0) {
      return {
        txHash: cleanHash,
        isCertChain: false,
        metadata: null,
        blockTime: txInfo.block_time,
        blockHeight: txInfo.block_height,
        error: 'Transaction tồn tại nhưng không có metadata',
      }
    }

    const label674 = metaArray.find((m: { label: string }) => m.label === '674')
    const label721 = metaArray.find((m: { label: string }) => m.label === '721')

    let isCertChain = false
    let mergedMetadata: CertChainMetadata = { version: 'v2' }

    if (label674?.json_metadata) {
      const oldFormat = label674.json_metadata as CertChainMetadata
      if (oldFormat.credential || oldFormat.issuer) {
        mergedMetadata = { ...oldFormat, version: 'v2' }
        isCertChain = true
      } else {
        const parsed = parseCip20Msg(label674.json_metadata)
        if (parsed) {
          mergedMetadata = { ...mergedMetadata, ...parsed }
          if (parsed.msg?.some((m) => m.toLowerCase().includes('certchain'))) {
            isCertChain = true
          }
        }
      }
    }

    if (label721?.json_metadata) {
      const parsed = parseCip25(label721.json_metadata)
      if (parsed) {
        const mergedIssuer = parsed.issuer?.name
          ? parsed.issuer
          : mergedMetadata.issuer

        mergedMetadata = {
          ...mergedMetadata,
          ...parsed,
          credential: {
            ...(mergedMetadata.credential || {}),
            ...(parsed.credential || {}),
          },
          issuer: mergedIssuer,
        }
        isCertChain = true
      }
    }

    if (!isCertChain) {
      return {
        txHash: cleanHash,
        isCertChain: false,
        metadata: null,
        blockTime: txInfo.block_time,
        blockHeight: txInfo.block_height,
        error: 'Transaction tồn tại nhưng không phải CertChain (thiếu metadata 674/721)',
      }
    }

    return {
      txHash: cleanHash,
      isCertChain: true,
      metadata: mergedMetadata,
      blockTime: txInfo.block_time,
      blockHeight: txInfo.block_height,
    }
  } catch (err) {
    return {
      txHash: cleanHash,
      isCertChain: false,
      metadata: null,
      error: err instanceof Error ? err.message : 'Lỗi không xác định',
    }
  }
}
