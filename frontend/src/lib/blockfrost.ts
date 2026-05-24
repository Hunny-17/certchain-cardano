const BLOCKFROST_BASE = 'https://cardano-preprod.blockfrost.io/api/v0'
const API_KEY = import.meta.env.VITE_BLOCKFROST_KEY as string

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

    const metaRes = await fetch(`${BLOCKFROST_BASE}/txs/${cleanHash}/metadata`, {
      headers: { project_id: API_KEY },
    })
    const metaArray = await metaRes.json()

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

    // Strict CertChain detection: must have label 674 with "CertChain" in msg
    // OR must be a CIP-25 NFT with a parseable asset (V2 mint)
    let isCertChain = false
    let mergedMetadata: CertChainMetadata = {}

    // Parse CIP-20 (label 674) if exists
    if (label674?.json_metadata) {
      // Check if it's the OLD M1 format (with credential.major, issuer.name, etc.)
      const oldFormat = label674.json_metadata as CertChainMetadata
      if (oldFormat.credential || oldFormat.issuer) {
        // OLD format — use as-is for backward compat with M1
        mergedMetadata = { ...oldFormat }
        isCertChain = true
      } else {
        // NEW V2 format (msg array)
        const parsed = parseCip20Msg(label674.json_metadata)
        if (parsed) {
          mergedMetadata = { ...mergedMetadata, ...parsed }
          // Detect CertChain by checking msg content
          if (parsed.msg?.some((m) => m.toLowerCase().includes('certchain'))) {
            isCertChain = true
          }
        }
      }
    }

    // Parse CIP-25 (label 721) if exists — V2 NFT metadata
    if (label721?.json_metadata) {
      const parsed = parseCip25(label721.json_metadata)
      if (parsed) {
        // Smart merge for issuer: prefer CIP-25 institution name over CIP-20 address
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
        isCertChain = true // CIP-25 NFT means it's a CertChain credential
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