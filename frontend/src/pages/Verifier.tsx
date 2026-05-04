import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { ScanLine, Type, Loader2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import VerifyResult from '../components/VerifyResult'
import { verifyTxHash, type VerificationResult } from '../lib/blockfrost'

type Mode = 'manual' | 'qr'

export default function Verifier() {
  const [mode, setMode] = useState<Mode>('manual')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleVerify = async (hash: string) => {
    if (!hash.trim()) return
    setLoading(true)
    setResult(null)
    const res = await verifyTxHash(hash)
    setResult(res)
    setLoading(false)
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Xác minh bằng cấp</h1>
            <p className="text-white/60">Quét QR code trên bằng hoặc paste transaction hash để kiểm tra trên Cardano blockchain.</p>
          </div>

          <div className="flex p-1 rounded-xl bg-bg-card border border-white/10 mb-6">
            <button onClick={() => setMode('manual')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${mode === 'manual' ? 'bg-white text-bg-dark' : 'text-white/60 hover:text-white'}`}>
              <Type className="w-4 h-4" />
              Nhập TxHash
            </button>
            <button onClick={() => setMode('qr')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${mode === 'qr' ? 'bg-white text-bg-dark' : 'text-white/60 hover:text-white'}`}>
              <ScanLine className="w-4 h-4" />
              Quét QR
            </button>
          </div>

          {mode === 'manual' && (
            <div className="space-y-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851"
                className="w-full p-4 rounded-xl bg-bg-card border border-white/10 focus:border-cardano-teal focus:outline-none font-mono text-sm resize-none"
                rows={3}
              />
              <button onClick={() => handleVerify(input)} disabled={loading || !input.trim()} className="w-full py-3 rounded-xl bg-white text-bg-dark font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang truy vấn blockchain...
                  </>
                ) : (
                  'Xác minh'
                )}
              </button>
            </div>
          )}

          {mode === 'qr' && (
            <div className="rounded-xl overflow-hidden bg-bg-card border border-white/10">
              <Scanner
                onScan={handleQrScan}
                onError={(err) => console.error(err)}
                styles={{ container: { width: '100%' } }}
              />
              <div className="p-4 text-center text-sm text-white/60">Hướng camera vào QR code trên bằng để quét</div>
            </div>
          )}

          {result && <VerifyResult result={result} />}
        </div>
      </div>
    </div>
  )
}