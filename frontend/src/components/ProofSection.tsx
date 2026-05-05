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
    <section id="proof" className="border-b border-ink">
      <div className="border-b border-ink px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-xs text-ink-muted">
          [03] / PROOF OF EXECUTION / ON-CHAIN
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
          <div>
            <div className="font-mono text-xs text-ink-muted mb-6 uppercase tracking-widest">
              ✓ M1 milestone · 2026.05.04
            </div>
            <h2 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-8">
              Not a concept.<br />
              <em className="italic" style={{ color: '#0033AD' }}>It runs.</em>
            </h2>
            <p className="text-lg text-ink-muted leading-relaxed max-w-md">
              The first CertChain transaction is live on Cardano Preprod. Anyone can verify it. The infrastructure works today, not in a roadmap slide.
            </p>
          </div>

          <div className="border border-ink">
            <div className="border-b border-ink p-5 grid grid-cols-2 gap-6 font-mono text-xs">
              <div>
                <div className="text-ink-muted uppercase tracking-widest mb-2">Network</div>
                <div>Cardano Preprod</div>
              </div>
              <div>
                <div className="text-ink-muted uppercase tracking-widest mb-2">Standard</div>
                <div>CIP-20 Metadata</div>
              </div>
            </div>

            <div className="bg-ink text-bg p-5">
              <div className="font-mono text-[10px] opacity-60 uppercase tracking-widest mb-3">
                Transaction Hash
              </div>
              <div className="font-mono text-[11px] break-all leading-relaxed mb-4">
                {txHash}
              </div>
              <button onClick={handleCopy} className="font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                {copied ? '✓ COPIED' : '⧉ COPY HASH'}
              </button>
            </div>

            <div className="grid grid-cols-2 border-t border-ink">
              <a href={`https://preprod.cardanoscan.io/transaction/${txHash}`} target="_blank" rel="noopener noreferrer" className="border-r border-ink p-4 font-mono text-xs uppercase tracking-widest text-center hover:bg-ink hover:text-bg transition-colors">
                Cardanoscan ↗
              </a>
              <a href={`https://preprod.cexplorer.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="p-4 font-mono text-xs uppercase tracking-widest text-center hover:bg-ink hover:text-bg transition-colors">
                Cexplorer ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}