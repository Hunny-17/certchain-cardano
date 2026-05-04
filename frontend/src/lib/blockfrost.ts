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
}

export interface VerificationResult {
  txHash: string
  isCertChain: boolean
  metadata: CertChainMetadata | null
  blockTime?: number
  blockHeight?: number
  error?: string
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

    const certEntry = Array.isArray(metaArray)
      ? metaArray.find((m: { label: string }) => m.label === '674')
      : null

    if (!certEntry) {
      return {
        txHash: cleanHash,
        isCertChain: false,
        metadata: null,
        blockTime: txInfo.block_time,
        blockHeight: txInfo.block_height,
        error: 'Transaction tồn tại nhưng không phải CertChain (thiếu metadata 674)',
      }
    }

    return {
      txHash: cleanHash,
      isCertChain: true,
      metadata: certEntry.json_metadata as CertChainMetadata,
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