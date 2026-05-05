import { Link } from 'react-router-dom'

type Role = {
  num: string
  title: string
  role: string
  description: string
  isAccent: boolean
  href?: string // route if clickable; absent = "coming soon"
  cta?: string
  comingSoon?: boolean
}

const roles: Role[] = [
  {
    num: '01',
    title: 'Issuer',
    role: 'University',
    description:
      'Sign and issue credentials directly on-chain. Bulk digitize legacy diplomas via Qwen-VL OCR.',
    isAccent: false,
    href: '/issue',
    cta: 'Open Issuer Portal',
  },
  {
    num: '02',
    title: 'Holder',
    role: 'Student',
    description:
      'Own credentials as portable QR codes. Share with employers via link or scan. No platform lock-in.',
    isAccent: true,
    comingSoon: true,
    cta: 'Wallet — V2 milestone',
  },
  {
    num: '03',
    title: 'Verifier',
    role: 'Employer',
    description:
      'Scan QR. Get instant authenticity check from Cardano blockchain. No login. No paperwork.',
    isAccent: false,
    href: '/verify',
    cta: 'Open Verifier',
  },
]

export default function RoleCards() {
  return (
    <section id="how" className="border-b border-ink">
      <div className="border-b border-ink px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-xs text-ink-muted">
          [02] / SYSTEM ARCHITECTURE / THREE ROLES
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-16 max-w-3xl">
          Three roles. <em className="italic" style={{ color: '#0033AD' }}>One</em>{' '}
          blockchain. <em className="italic">Zero</em> trust gaps.
        </h2>

        <div className="grid md:grid-cols-3 border-t border-ink">
          {roles.map((role) => {
            const cardInner = (
              <>
                <div className="font-mono text-xs mb-12 opacity-60 flex items-center justify-between">
                  <span>[{role.num}]</span>
                  {role.comingSoon && (
                    <span className="text-[9px] uppercase tracking-[0.2em] border border-current px-2 py-1 opacity-80">
                      V2
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs uppercase tracking-widest mb-3 opacity-70">
                  {role.role}
                </div>
                <h3 className="font-serif text-5xl mb-6">{role.title}</h3>
                <p
                  className={`text-base leading-relaxed mb-8 ${
                    role.isAccent
                      ? 'opacity-90'
                      : 'text-ink-muted group-hover:text-bg/80'
                  }`}
                >
                  {role.description}
                </p>
                <div
                  className={`font-mono text-xs uppercase tracking-[0.15em] flex items-center justify-between border-t pt-4 ${
                    role.isAccent ? 'border-current/30' : 'border-current/20'
                  }`}
                >
                  <span
                    className={
                      role.comingSoon
                        ? 'opacity-60'
                        : 'group-hover:translate-x-1 transition-transform'
                    }
                  >
                    {role.cta}
                  </span>
                  {!role.comingSoon && (
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  )}
                </div>
              </>
            )

            const baseClasses = `border-r border-ink last:border-r-0 p-8 group relative overflow-hidden transition-colors ${
              role.isAccent ? '' : 'hover:bg-ink hover:text-bg'
            } ${role.comingSoon ? 'cursor-default' : 'cursor-pointer'}`

            const baseStyle = role.isAccent
              ? { background: '#0033AD', color: '#FAFAF7' }
              : {}

            // Clickable card → wrap with <Link>
            if (role.href && !role.comingSoon) {
              return (
                <Link
                  key={role.num}
                  to={role.href}
                  className={baseClasses}
                  style={baseStyle}
                >
                  {cardInner}
                </Link>
              )
            }

            // Non-clickable card (Coming Soon) → plain div
            return (
              <div
                key={role.num}
                className={baseClasses}
                style={baseStyle}
              >
                {cardInner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}