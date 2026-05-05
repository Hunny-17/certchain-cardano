import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import Navbar from '../components/Navbar'
import VerifyResult from '../components/VerifyResult'
import { verifyTxHash, type VerificationResult } from '../lib/blockfrost'
import { loadMockCredential, mockToVerificationResult } from '../lib/credentialStore'
import { useParams } from "react-router-dom";

type Mode = 'manual' | 'qr'

const SAMPLE_HASH = 'fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851'
export default function Verifier() {
  const { txHash } = useParams<{ txHash?: string }>();
  const [mode, setMode] = useState<Mode>('manual')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
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
      // Small delay so loading panel is visible — feels intentional, not jarring.
      await new Promise((r) => setTimeout(r, 600))
      setResult(mockToVerificationResult(localMock))
      setLoading(false)
      return
    }

    const res = await verifyTxHash(cleaned)
    setResult(res)
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

        {result && <VerifyResult result={result} />}
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
}