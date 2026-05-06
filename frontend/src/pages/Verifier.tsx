import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import Navbar from '../components/Navbar'
import VerifyResult from '../components/VerifyResult'
import { verifyTxHash, type VerificationResult } from '../lib/blockfrost'
import { loadMockCredential, mockToVerificationResult } from '../lib/credentialStore'
import { useParams } from "react-router-dom";
import { getUserRole, type UserRole } from "../lib/userRole";
import RoleBadge from "../components/RoleBadge";
import { verifyAgainstHash } from "../lib/hashUtils";

type Mode = 'manual' | 'qr' | 'history'

const SAMPLE_HASH = 'fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851'
// ============================================================================
// Verify log — localStorage helpers for Verifier history
// ============================================================================
const VERIFY_LOG_PREFIX = 'certchain:verify-log:'

interface VerifyLogEntry {
  txHash: string
  recipientName: string
  credentialTitle: string
  issuer: string
  isMock: boolean
  verifiedAt: number
}

function saveVerifyLog(result: VerificationResult) {
  if (!result.isCertChain || !result.metadata) return
  const meta = result.metadata as any
  const entry: VerifyLogEntry = {
    txHash: result.txHash,
    recipientName: meta._recipientName || meta.credential?.major || 'Unknown',
    credentialTitle: result.metadata.credential?.major || 'Unknown',
    issuer: result.metadata.issuer?.name || result.metadata.issuer?.id || 'Unknown',
    isMock: meta._isMock === true,
    verifiedAt: Date.now(),
  }
  try {
    localStorage.setItem(VERIFY_LOG_PREFIX + entry.verifiedAt, JSON.stringify(entry))
  } catch (e) {
    console.warn('[verifyLog] save failed:', e)
  }
}

function listVerifyLogs(): VerifyLogEntry[] {
  const out: VerifyLogEntry[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(VERIFY_LOG_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw) out.push(JSON.parse(raw))
    } catch {
      // skip
    }
  }
  out.sort((a, b) => b.verifiedAt - a.verifiedAt)
  return out
}

function clearVerifyLogs() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(VERIFY_LOG_PREFIX)) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
export default function Verifier() {
  const { txHash } = useParams<{ txHash?: string }>();
  const [mode, setMode] = useState<Mode>('manual')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [userRole, setRoleState] = useState<UserRole | null>(null);

  useEffect(() => {
    setRoleState(getUserRole());
  }, []);
  
  useEffect(() => {
    if (txHash) {
      setInput(txHash)
      handleVerify(txHash)
    }
  }, [txHash])

  const handleVerify = async (hash: string) => {
    const cleaned = hash.trim().toLowerCase()
    if (!cleaned) return

    // Preflight: Cardano tx hash must be 64 hex chars
    if (!/^[a-f0-9]{64}$/.test(cleaned)) {
      setResult({
        txHash: cleaned,
        isCertChain: false,
        metadata: null,
        error: 'Invalid format. Cardano transaction hash must be exactly 64 hexadecimal characters (0-9, a-f).'
      })
      return
    }

    setLoading(true)
    setResult(null)

    // V1 hybrid: check local mock store first.
    // If user issued this credential via Issuer Portal → render from localStorage.
    // Otherwise (e.g. M1 hash) → fallback to real Blockfrost query.
    const localMock = loadMockCredential(cleaned)
    if (localMock) {
      await new Promise((r) => setTimeout(r, 600))
      const mockResult = mockToVerificationResult(localMock)
      setResult(mockResult)
      saveVerifyLog(mockResult)
      setLoading(false)
      return
    }

    const res = await verifyTxHash(cleaned)
    setResult(res)
    if (res.isCertChain) saveVerifyLog(res)
    setLoading(false)
  }

  const loadSample = () => {
    setInput(SAMPLE_HASH)
    handleVerify(SAMPLE_HASH)
  }

  const handleQrScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes.length > 0) {
      const value = detectedCodes[0].rawValue
      const match = value.match(/[a-f0-9]{64}/i)
      const txHash = match ? match[0] : value
      setInput(txHash)
      setMode('manual')
      handleVerify(txHash)
    }
  }

  const handleCameraError = (err: unknown) => {
    console.error('Camera error:', err)
    const error = err as Error
    let msg = 'Camera unavailable. '
    if (error.name === 'NotAllowedError') msg += 'Permission denied. Allow camera access in browser settings.'
    else if (error.name === 'NotFoundError') msg += 'No camera detected on this device.'
    else if (error.name === 'NotReadableError') msg += 'Camera is in use by another app (Zoom, Teams). Close it and retry.'
    else msg += `Error: ${error.message || 'unknown'}`
    setCameraError(msg)
  }

  const switchToQr = () => { setMode('qr'); setCameraError(null) }

  return (
    <div className="min-h-screen">
      <Navbar />
      <RoleBadge role={userRole} />
      <div className="border-b border-ink px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-xs text-ink-muted">
          → VERIFIER · CARDANO PREPROD · CIP-20 METADATA QUERY
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <div className="font-mono text-xs text-ink-muted mb-6 uppercase tracking-widest">
          [01] / VERIFY A CREDENTIAL
        </div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-6">
          Scan or paste.<br />
          <em className="italic" style={{ color: '#0033AD' }}>Get the truth</em>.
        </h1>
        <p className="text-lg text-ink-muted leading-relaxed mb-12 max-w-xl">
          Enter the transaction hash printed on the credential, or scan its QR code. The verification queries Cardano Preprod directly.
        </p>

        <div className="grid grid-cols-2 border border-ink mb-6 font-mono text-xs uppercase tracking-widest">
          <button
            onClick={() => setMode('manual')}
            className={`py-3 border-r border-ink transition-colors ${mode === 'manual' ? 'bg-ink text-bg' : 'hover:bg-bg-secondary'}`}
          >
            ⌨ Manual Input
          </button>
          <button
            onClick={switchToQr}
            className={`py-3 transition-colors ${mode === 'qr' ? 'bg-ink text-bg' : 'hover:bg-bg-secondary'}`}
          >
            ⌗ Scan QR
          </button>
          <button
            onClick={() => setMode('history')}
            className={`py-3 transition-colors ${mode === 'history' ? 'bg-ink text-bg' : 'hover:bg-bg-secondary'}`}
          >
            ⊞ History
          </button>
        </div>

        {mode === 'manual' && (
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851"
              className="w-full p-4 border border-ink bg-bg focus:bg-bg-secondary focus:outline-none font-mono text-sm resize-none placeholder:text-ink-muted"
              rows={3}
            />
            <button
              onClick={() => handleVerify(input)}
              disabled={loading || !input.trim()}
              className="w-full py-4 bg-ink text-bg font-mono text-sm uppercase tracking-widest hover:bg-cardano-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>Querying blockchain...</span>
                </>
              ) : (
                <span>▶ VERIFY</span>
              )}
            </button>
            
            {/* Loading status panel */}
            {loading && (
              <div className="border border-ink mt-2 p-5 space-y-3 loading-pulse">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Network
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: '#0033AD' }}>
                    ● Cardano Preprod
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Provider
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                    Blockfrost API
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Operation
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                    Fetching CIP-20 metadata
                  </span>
                </div>
                <div className="pt-3 border-t border-ink/20">
                  <div className="font-mono text-[10px] text-ink-muted leading-relaxed">
                    Querying transaction <code className="text-ink">{input.slice(0, 16)}...{input.slice(-8)}</code> on-chain. Typically resolves in 1-2 seconds.
                  </div>
                </div>
              </div>
            )}

            {/* Empty state — sample loader */}
            {!loading && !result && (
              <div className="pt-5 mt-2 border-t border-ink/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  First time? Try our M1 on-chain proof
                </div>
                <button
                  onClick={loadSample}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-cardano-blue transition-colors text-left md:text-right shrink-0"
                >
                  → Load demo credential
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'qr' && (
          <div className="border border-ink">
            {cameraError ? (
              <div className="p-12 text-center">
                <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-4">⚠ CAMERA OFFLINE</div>
                <p className="text-base text-ink mb-6 max-w-md mx-auto">{cameraError}</p>
                <button
                  onClick={() => { setCameraError(null); setMode('manual') }}
                  className="font-mono text-xs underline underline-offset-4 hover:text-cardano-blue transition-colors"
                >
                  → switch to manual input
                </button>
              </div>
            ) : (
              <>
                <Scanner
                  onScan={handleQrScan}
                  onError={handleCameraError}
                  constraints={{ facingMode: 'environment' }}
                  styles={{ container: { width: '100%' } }}
                />
                <div className="border-t border-ink p-4 text-center font-mono text-xs uppercase tracking-widest text-ink-muted">
                  → align qr code within frame
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'history' && (
          <VerifyHistory onReVerify={(hash) => { setMode('manual'); setInput(hash); handleVerify(hash); }} />
        )}

        {result && mode !== 'history' && <VerifyResult result={result} />}
        {result && mode !== 'history' && result.isCertChain && <IdentityVerificationPanel result={result} />}
      </div>
      <style>{`
        @keyframes loading-pulse {
          0%, 100% { border-color: var(--ink, #000); }
          50% { border-color: #0033AD; }
        }
        .loading-pulse {
          animation: loading-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
   
// ============================================================================
// VerifyHistory — list of past successful verifications
// ============================================================================
function VerifyHistory({ onReVerify }: { onReVerify: (hash: string) => void }) {
  const [logs, setLogs] = useState<VerifyLogEntry[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setLogs(listVerifyLogs())
  }, [])

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearVerifyLogs()
    setLogs([])
    setConfirmClear(false)
  }

  const distinctIssuers = Array.from(new Set(logs.map((l) => l.issuer)))

  if (logs.length === 0) {
    return (
      <div className="border border-ink bg-white p-8 md:p-12 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-4">
          [ Empty history ]
        </div>
        <h2
          className="text-3xl md:text-4xl leading-tight mb-4 max-w-xl mx-auto font-serif"
        >
          No verifications yet.
        </h2>
        <p className="text-sm text-ink-muted mb-8 max-w-md mx-auto">
          Once you verify credentials, they'll appear here for quick re-checking.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 mb-6">
        <div className="flex items-baseline gap-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ink-muted">
            № 02 · Verification history
          </span>
          <span className="font-mono text-xs text-ink-muted">
            {logs.length} total
          </span>
        </div>
        <button
          onClick={handleClear}
          className="text-[10px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink underline underline-offset-4"
        >
          {confirmClear ? '✕ Click again to confirm' : '↺ Clear history'}
        </button>
      </div>

      {/* Stats card */}
      {distinctIssuers.length > 0 && (
        <div
          className="border border-ink p-4 mb-6"
          style={{ background: '#FAFAF7' }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            Trusted issuers · {distinctIssuers.length}
          </div>
          <div className="flex flex-wrap gap-2">
            {distinctIssuers.map((iss) => (
              <span
                key={iss}
                className="font-mono text-[10px] uppercase tracking-[0.15em] border border-ink px-2 py-1"
              >
                {iss}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log list */}
      <div className="border border-ink bg-white">
        {logs.map((log) => (
          <button
            key={log.txHash + log.verifiedAt}
            onClick={() => onReVerify(log.txHash)}
            className={`w-full text-left grid grid-cols-12 gap-3 px-5 py-4 border-b border-ink/30 last:border-b-0 hover:bg-bg-secondary transition-colors`}
          >
            <div className="col-span-5 truncate">
              <div className="font-serif text-base md:text-lg leading-tight">
                {log.recipientName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-ink-muted truncate mt-1">
                {log.credentialTitle}
              </div>
            </div>
            <div className="col-span-4 hidden md:flex items-center text-[10px] uppercase tracking-[0.15em] text-ink-muted truncate">
              {log.issuer}
            </div>
            <div className="col-span-5 md:col-span-2 flex items-center justify-end md:justify-start text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              {timeAgo(log.verifiedAt)}
            </div>
            <div className="col-span-2 md:col-span-1 flex items-center justify-end">
              <span
                className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border"
                style={
                  log.isMock
                    ? { color: '#B8860B', borderColor: '#B8860B' }
                    : { color: '#0033AD', borderColor: '#0033AD' }
                }
              >
                {log.isMock ? 'Mock' : 'Real'}
              </span>
            </div>
            {/* Mobile-only issuer line */}
            <div className="col-span-12 md:hidden text-[10px] uppercase tracking-[0.15em] text-ink-muted truncate -mt-2">
              {log.issuer}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        Click any row to re-verify on-chain
      </div>
    </div>
  )
}

  // ============================================================================
// IdentityVerificationPanel — anti-impersonation check
// Shown only for credentials with hashes (mock V1 issued via IssuerPortal).
// M1 demo doesn't have hashes → panel hidden.
// ============================================================================
function IdentityVerificationPanel({ result }: { result: VerificationResult }) {
  const [studentIdInput, setStudentIdInput] = useState('')
  const [dobInput, setDobInput] = useState('')
  const [studentIdStatus, setStudentIdStatus] = useState<'idle' | 'checking' | 'match' | 'mismatch'>('idle')
  const [dobStatus, setDobStatus] = useState<'idle' | 'checking' | 'match' | 'mismatch'>('idle')

  const isMock = (result.metadata as any)?._isMock === true
  const studentIdHash = result.metadata?.credential?.student_id_hash || ''
  const dobHash = result.metadata?.credential?.doc_hash || ''
  const hasHashes = !!(studentIdHash || dobHash)

  if (!isMock || !hasHashes) return null

  const checkStudentId = async () => {
    if (!studentIdInput.trim() || !studentIdHash) return
    setStudentIdStatus('checking')
    const match = await verifyAgainstHash(studentIdInput, studentIdHash)
    setStudentIdStatus(match ? 'match' : 'mismatch')
  }

  const checkDob = async () => {
    if (!dobInput.trim() || !dobHash) return
    setDobStatus('checking')
    const match = await verifyAgainstHash(dobInput, dobHash)
    setDobStatus(match ? 'match' : 'mismatch')
  }

  const allMatched =
    (studentIdHash ? studentIdStatus === 'match' : true) &&
    (dobHash ? dobStatus === 'match' : true) &&
    (studentIdStatus !== 'idle' || dobStatus !== 'idle')

  const anyMismatch = studentIdStatus === 'mismatch' || dobStatus === 'mismatch'

  return (
    <div className="mt-12 border-2 border-ink">
      {/* Header */}
      <div className="border-b-2 border-ink p-6">
        <div className="flex items-baseline gap-4 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            [03] / Identity Verification
          </span>
          <span className="h-px flex-1 bg-ink/20" />
        </div>
        <h3
          className="text-2xl md:text-3xl leading-tight mb-2"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Anti-impersonation check
        </h3>
        <p className="text-sm text-ink-muted leading-relaxed max-w-2xl">
          The credential is authentic on-chain — but is the person presenting
          it the rightful owner? Ask the candidate to confirm their identity.
          Inputs are hashed locally and compared against the on-chain hashes
          above. Plaintext is never transmitted.
        </p>
      </div>

      {/* Inputs */}
      <div className="p-6 space-y-5">
        {studentIdHash && (
          <IdentityField
            label="Student ID"
            placeholder="VHU2024001"
            type="text"
            value={studentIdInput}
            onChange={setStudentIdInput}
            status={studentIdStatus}
            onCheck={checkStudentId}
          />
        )}

        {dobHash && (
          <IdentityField
            label="Date of Birth"
            placeholder=""
            type="date"
            value={dobInput}
            onChange={setDobInput}
            status={dobStatus}
            onCheck={checkDob}
          />
        )}
      </div>

      {/* Status footer */}
      <div
        className={`border-t-2 border-ink p-5 transition-colors ${
          allMatched
            ? 'bg-[#0033AD] text-white'
            : anyMismatch
              ? ''
              : 'bg-bg-secondary'
        }`}
        style={anyMismatch ? { background: '#FEE2E2' } : {}}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]">
            {allMatched ? (
              <span>✓ Identity confirmed · candidate is rightful owner</span>
            ) : anyMismatch ? (
              <span style={{ color: '#C53030' }}>
                ✕ Mismatch detected · do not trust this credential for this person
              </span>
            ) : (
              <span className="text-ink-muted">
                ⏸ Awaiting verification — enter values above
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function IdentityField({
  label,
  placeholder,
  type,
  value,
  onChange,
  status,
  onCheck,
}: {
  label: string
  placeholder: string
  type: 'text' | 'date'
  value: string
  onChange: (v: string) => void
  status: 'idle' | 'checking' | 'match' | 'mismatch'
  onCheck: () => void
}) {
  const statusBadge = () => {
    switch (status) {
      case 'checking':
        return (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            ⟳ Checking...
          </span>
        )
      case 'match':
        return (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: '#0033AD' }}
          >
            ✓ Match
          </span>
        )
      case 'mismatch':
        return (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: '#C53030' }}
          >
            ✕ Mismatch
          </span>
        )
      default:
        return (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Not checked
          </span>
        )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          {label}
        </label>
        {statusBadge()}
      </div>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-2 border-ink px-4 py-3 text-sm font-mono focus:outline-none focus:border-cardano-blue placeholder:text-ink-muted"
        />
        <button
          onClick={onCheck}
          disabled={!value.trim() || status === 'checking'}
          className="bg-ink text-bg px-5 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-cardano-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Verify →
        </button>
      </div>
    </div>
  )
 }
}