import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import type { VerificationResult } from '../lib/blockfrost'

export default function VerifyResult({ result }: { result: VerificationResult }) {
  const success = result.isCertChain && result.metadata

  return (
    <div className="mt-8">
      <div className={`p-6 rounded-2xl border ${success ? 'bg-cardano-teal/5 border-cardano-teal/30' : 'bg-red-500/5 border-red-500/30'}`}>
        <div className="flex items-start gap-4">
          {success ? <CheckCircle2 className="w-8 h-8 text-cardano-teal shrink-0" /> : <XCircle className="w-8 h-8 text-red-400 shrink-0" />}
          <div>
            <h3 className="text-xl font-bold mb-1">{success ? 'Bằng cấp xác thực ✓' : 'Không xác minh được'}</h3>
            <p className="text-sm text-white/70">
              {success ? 'Transaction này được phát hành bởi một Issuer trên Cardano và chứa metadata CertChain hợp lệ.' : result.error || 'Có lỗi khi kiểm tra'}
            </p>
          </div>
        </div>
      </div>

      {success && result.metadata && (
        <div className="mt-6 p-6 rounded-2xl bg-bg-card border border-white/10">
          <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Thông tin bằng</h4>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Field label="Issuer" value={result.metadata.issuer?.name || result.metadata.issuer?.id} />
            <Field label="Loại bằng" value={result.metadata.credential?.type} />
            <Field label="Ngành" value={result.metadata.credential?.major} />
            <Field label="GPA" value={result.metadata.credential?.gpa} />
            <Field label="Ngày tốt nghiệp" value={result.metadata.credential?.graduation_date} />
            {result.blockTime && <Field label="Thời gian on-chain" value={new Date(result.blockTime * 1000).toLocaleString('vi-VN')} />}
          </div>

          <div className="space-y-3 mb-6">
            {result.metadata.credential?.name_hash && <HashRow label="Hash tên" value={result.metadata.credential.name_hash} />}
            {result.metadata.credential?.student_id_hash && <HashRow label="Hash MSSV" value={result.metadata.credential.student_id_hash} />}
            {result.metadata.credential?.doc_hash && <HashRow label="Hash tài liệu gốc" value={result.metadata.credential.doc_hash} />}
          </div>

          <a href={`https://preprod.cardanoscan.io/transaction/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-cardano-teal hover:underline">
            Xem trên Cardanoscan
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm">{value || <span className="text-white/30">—</span>}</div>
    </div>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <code className="block text-xs font-mono text-white/70 break-all p-2 rounded bg-bg-dark">{value}</code>
    </div>
  )
}