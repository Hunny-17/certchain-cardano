import { CheckCircle2, ExternalLink, Copy } from 'lucide-react'
import { useState } from 'react'

export default function ProofSection() {
  const txHash = import.meta.env.VITE_M1_TXHASH || 'fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="proof" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cardano-teal/10 border border-cardano-teal/30 mb-6">
            <CheckCircle2 className="w-4 h-4 text-cardano-teal" />
            <span className="text-xs font-medium text-cardano-teal">M1 POC Verified</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Đây không phải concept.
            <br />
            Nó đã chạy.
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Transaction CertChain đầu tiên đã được submit lên Cardano Preprod ngày 04/05/2026. Bất kỳ ai cũng có thể xem.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-bg-card to-bg-dark border border-white/10">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Network</div>
              <div className="font-mono text-sm">Cardano Preprod Testnet</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Standard</div>
              <div className="font-mono text-sm">CIP-20 Transaction Metadata</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Transaction Hash</div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-dark border border-white/5">
              <code className="flex-1 text-xs font-mono text-cardano-teal break-all">{txHash}</code>
              <button onClick={handleCopy} className="shrink-0 p-2 rounded-md hover:bg-white/5 transition" title="Copy">
                {copied ? <CheckCircle2 className="w-4 h-4 text-cardano-teal" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={`https://preprod.cardanoscan.io/transaction/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-bg-dark text-sm font-semibold hover:bg-white/90 transition">
              Cardanoscan
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href={`https://preprod.cexplorer.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm font-semibold hover:bg-white/5 transition">
              Cexplorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}