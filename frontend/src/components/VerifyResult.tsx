import type { VerificationResult } from '../lib/blockfrost'

export default function VerifyResult({ result }: { result: VerificationResult }) {
  const success = result.isCertChain && result.metadata

  return (
    <div className="mt-12">
      <div className={`border border-ink p-6 ${success ? '' : 'bg-bg-secondary'}`} style={success ? { background: '#0033AD', color: '#FAFAF7' } : {}}>
        <div className="font-mono text-xs uppercase tracking-widest opacity-70 mb-3">
          {success ? '✓ VERIFICATION PASSED' : '✕ VERIFICATION FAILED'}
        </div>
        <h3 className="font-serif text-3xl md:text-4xl leading-tight">
          {success ? 'Authentic credential.' : 'Cannot verify this hash.'}
        </h3>
        {!success && (
          <p className="font-mono text-xs text-ink-muted mt-3">{result.error || 'Unknown error'}</p>
        )}
      </div>

      {success && result.metadata && (
        <div className="border-x border-b border-ink">
          <div className="border-b border-ink p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-6">
              [01] / Credential Details
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Issuer" value={result.metadata.issuer?.name || result.metadata.issuer?.id} />
              <Field label="Type" value={result.metadata.credential?.type} />
              <Field label="Major" value={result.metadata.credential?.major} />
              <Field label="GPA" value={result.metadata.credential?.gpa} />
              <Field label="Graduation" value={result.metadata.credential?.graduation_date} />
              {result.blockTime && (
                <Field label="On-chain at" value={new Date(result.blockTime * 1000).toLocaleString('en-US')} />
              )}
            </div>
          </div>

          {(result.metadata.credential?.name_hash || result.metadata.credential?.student_id_hash || result.metadata.credential?.doc_hash) && (
            <div className="border-b border-ink p-6 bg-bg-secondary">
              <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-4">
                [02] / SHA-256 Hashes (Privacy-Preserving)
              </div>
              <div className="space-y-3">
                {result.metadata.credential?.name_hash && <HashRow label="name_hash" value={result.metadata.credential.name_hash} />}
                {result.metadata.credential?.student_id_hash && <HashRow label="student_id_hash" value={result.metadata.credential.student_id_hash} />}
                {result.metadata.credential?.doc_hash && <HashRow label="doc_hash" value={result.metadata.credential.doc_hash} />}
              </div>
            </div>
          )}

          <a
            href={`https://preprod.cardanoscan.io/transaction/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 font-mono text-xs uppercase tracking-widest text-center hover:bg-ink hover:text-bg transition-colors"
          >
            → view full transaction on cardanoscan ↗
          </a>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">{label}</div>
      <div className="text-base">{value || <span className="text-ink-muted">—</span>}</div>
    </div>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{label}</div>
      <code className="block font-mono text-xs break-all bg-ink text-bg p-3">{value}</code>
    </div>
  )
}