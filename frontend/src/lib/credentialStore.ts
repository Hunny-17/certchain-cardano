// ============================================================================
// credentialStore.ts
// ----------------------------------------------------------------------------
// V1 mock credential store using localStorage.
// V2 will replace this with real Mesh.js publish + Blockfrost query.
// ----------------------------------------------------------------------------
// Strategy: hybrid mode
//   - User-issued credentials (via IssuerPortal) → saved here as "mock"
//   - M1 demo credential (real on-chain CIP-20) → bypass this, go to Blockfrost
//   - All mock credentials reference M1 txHash as the "anchor proof"
// ============================================================================

import type { VerificationResult } from './blockfrost'

// M1 anchor — real on-chain transaction proving the protocol works
export const M1_ANCHOR_TX =
  'fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851'

const STORAGE_PREFIX = 'certchain:'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface MockCredentialInput {
  recipientName: string
  recipientEmail: string
  credentialTitle: string
  institution: string
  issueDate: string
  credentialType: string
  notes: string
}

export interface StoredMockCredential extends MockCredentialInput {
  _mock: true
  _anchorTx: string // ref to M1
  _issuedAt: number // unix ms
  txHash: string
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Generate a fake but realistic-looking 64-char hex tx hash.
 * Uses crypto.getRandomValues for cryptographic-grade randomness so
 * collisions are negligible across demo sessions.
 */
export function generateMockTxHash(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Persist a mock credential to localStorage keyed by its fake txHash.
 */
export function saveMockCredential(
  txHash: string,
  input: MockCredentialInput,
): StoredMockCredential {
  const record: StoredMockCredential = {
    ...input,
    _mock: true,
    _anchorTx: M1_ANCHOR_TX,
    _issuedAt: Date.now(),
    txHash,
  }
  try {
    localStorage.setItem(STORAGE_PREFIX + txHash, JSON.stringify(record))
  } catch (e) {
    console.warn('[credentialStore] save failed:', e)
  }
  return record
}

/**
 * Load a mock credential by txHash. Returns null if not found or parse fails.
 */
export function loadMockCredential(txHash: string): StoredMockCredential | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + txHash)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredMockCredential
    if (!parsed._mock) return null
    return parsed
  } catch (e) {
    console.warn('[credentialStore] load failed:', e)
    return null
  }
}

/**
 * Convert a stored mock credential into the same VerificationResult shape
 * Blockfrost returns, so VerifyResult component can render it uniformly.
 */
export function mockToVerificationResult(
  stored: StoredMockCredential,
): VerificationResult {
  return {
    txHash: stored.txHash,
    isCertChain: true,
    metadata: {
      issuer: {
        name: stored.institution,
        id: stored.institution,
      },
      credential: {
        type: stored.credentialType,
        // Reuse existing fields that VerifyResult already renders.
        // V1 mock maps freely; V2 will use the proper CIP-20 schema.
        major: stored.credentialTitle,
        graduation_date: stored.issueDate,
      },
      // Recipient name lives in a custom field used only by mock badge.
      _recipientName: stored.recipientName,
      _recipientEmail: stored.recipientEmail,
      _notes: stored.notes,
      _isMock: true,
      _anchorTx: stored._anchorTx,
    } as never, // VerifyResult is permissive; V2 will type-tighten.
    blockTime: Math.floor(stored._issuedAt / 1000),
  }
}

/**
 * Dev helper — list all stored mocks. Not used in UI.
 */
export function listMockCredentials(): StoredMockCredential[] {
  const out: StoredMockCredential[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw) out.push(JSON.parse(raw))
    } catch {
      // skip
    }
  }
  return out
}