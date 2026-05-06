import { Link } from 'react-router-dom'
import { setUserRole, type UserRole } from '../lib/userRole'

export default function Hero() {
  return (
    <section className="border-b border-ink">
      <div className="border-b border-ink px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-mono text-xs">
          <span className="text-ink-muted">→ M1.POC.CONFIRMED · CARDANO PREPROD · BLOCK 12,847,201</span>
          <span className="text-ink-muted hidden md:inline">[2026.05.04 · 23:47 GMT+7]</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-end">
          <div className="animate-reveal">
            <div className="font-mono text-xs text-ink-muted mb-8 tracking-wide">
              [01] / EDUCATIONAL CREDENTIALS / ON-CHAIN
            </div>
            <h1 className="font-serif text-6xl md:text-8xl leading-[0.9] tracking-tight mb-8">
              Diplomas
              <br />
              that <em className="italic" style={{ color: '#0033AD' }}>cannot</em>
              <br />
              be forged.
            </h1>
            <p className="text-lg leading-relaxed text-ink-muted max-w-md mb-10">
              Issued on Cardano blockchain. Scan QR. Verified in 2 seconds. No paperwork. No legalization.
            </p>

            {/* ============ ROLE SELECTOR — 3 audiences ============ */}
            <div className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mb-3">
                I am a...
              </div>
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
                <RoleSelectorButton
                  to="/issue"
                  role="university"
                  label="University"
                  sub="Issue credentials"
                  variant="outline"
                />
                <RoleSelectorButton
                  to="/holder"
                  role="student"
                  label="Student"
                  sub="Hold credentials"
                  variant="filled"
                />
                <RoleSelectorButton
                  to="/verify"
                  role="employer"
                  label="Employer"
                  sub="Verify credentials"
                  variant="outline"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap font-mono text-xs">
              <Link
                to="/pitch"
                className="text-ink-muted hover:text-ink underline underline-offset-4 decoration-1 uppercase tracking-[0.15em]"
              >
                → View 10-slide pitch deck
              </Link>
              <span className="text-ink-muted hidden sm:inline">·</span>
              <a
                href="#how"
                className="text-ink-muted hover:text-ink uppercase tracking-[0.15em]"
              >
                How it works ↓
              </a>
            </div>
          </div>

          <div className="grid gap-3 animate-reveal" style={{ animationDelay: '0.2s' }}>
            <div className="bg-ink text-bg p-5 font-mono">
              <div className="flex items-center justify-between mb-3 text-[10px] opacity-60 uppercase tracking-widest">
                <span>tx_hash · live on preprod</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  CONFIRMED
                </span>
              </div>
              <div className="text-[11px] break-all leading-relaxed">
                fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-ink p-5 hover:bg-ink hover:text-bg transition-colors group cursor-default">
                <div className="font-serif text-5xl leading-none">
                  2<span className="text-2xl">s</span>
                </div>
                <div className="font-mono text-[10px] text-ink-muted group-hover:text-bg/70 mt-3 uppercase tracking-widest">
                  verify_time
                </div>
              </div>
              <div className="p-5" style={{ background: '#0033AD', color: '#FAFAF7' }}>
                <div className="font-serif text-5xl leading-none">
                  $0.05
                </div>
                <div className="font-mono text-[10px] opacity-70 mt-3 uppercase tracking-widest">
                  cost_per_cert
                </div>
              </div>
            </div>

            <a href="https://preprod.cardanoscan.io/transaction/fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-ink-muted hover:text-ink underline underline-offset-4 decoration-1">
              → view on cardanoscan ↗
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-ink py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap font-mono text-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className="mx-8">→ ISSUER · NTU-VN</span>
              <span className="mx-8 text-ink-muted">✕</span>
              <span className="mx-8">HOLDER · STUDENT</span>
              <span className="mx-8 text-ink-muted">✕</span>
              <span className="mx-8">VERIFIER · EMPLOYER</span>
              <span className="mx-8 text-ink-muted">✕</span>
              <span className="mx-8">CHAIN · CARDANO PREPROD</span>
              <span className="mx-8 text-ink-muted">✕</span>
              <span className="mx-8">STANDARD · CIP-20 METADATA</span>
              <span className="mx-8 text-ink-muted">✕</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function RoleSelectorButton({
  to,
  role,
  label,
  sub,
  variant,
}: {
  to: string;
  role: UserRole;
  label: string;
  sub: string;
  variant: 'outline' | 'filled';
}) {
  const handleClick = () => setUserRole(role);

  if (variant === 'filled') {
    return (
      <Link
        to={to}
        onClick={handleClick}
        className="group block p-4 transition-colors hover:opacity-90"
        style={{ background: '#0033AD', color: '#FAFAF7' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-sm uppercase tracking-[0.1em]">
            {label}
          </span>
          <span className="font-mono text-sm group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          {sub}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={handleClick}
      className="group block border-2 border-ink p-4 hover:bg-ink hover:text-bg transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm uppercase tracking-[0.1em]">
          {label}
        </span>
        <span className="font-mono text-sm group-hover:translate-x-1 transition-transform">
          →
        </span>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-hover:text-bg/70">
        {sub}
      </div>
    </Link>
  );
}