import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/issue', label: 'Issuer', shortLabel: 'Issue' },
  { to: '/holder', label: 'Holder', shortLabel: 'Holder' },
  { to: '/verify', label: 'Verifier', shortLabel: 'Verify' },
  { to: '/pitch', label: 'Pitch', shortLabel: 'Pitch' },
  { to: '/v3-demo', label: 'V3 Demo ✦', shortLabel: 'V3' },
]

export default function Navbar() {
  const location = useLocation()

  const isActive = (to: string) => {
    if (to === '/verify') return location.pathname.startsWith('/verify')
    return location.pathname === to
  }

  return (
    <nav className="border-b border-ink bg-bg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-4 h-4" style={{ background: '#0033AD' }} />
          <span className="font-mono font-medium text-xs md:text-sm tracking-tight">
            CERTCHAIN/v0.1
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-5 font-mono text-[10px] md:text-xs">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`uppercase tracking-[0.15em] transition-colors hidden sm:inline ${
                isActive(link.to)
                  ? 'text-ink underline underline-offset-4 decoration-2'
                  : 'text-ink-muted hover:text-ink'
              }`}
              style={
                isActive(link.to)
                  ? { textDecorationColor: '#0033AD' }
                  : {}
              }
            >
              {link.label}
            </Link>
          ))}

          <a
            href="https://github.com/Hunny-17/certchain-cardano"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline uppercase tracking-[0.15em] text-ink-muted hover:text-ink transition-colors"
          >
            GitHub ↗
          </a>

          <Link
            to="/verify"
            className="bg-ink text-bg px-3 md:px-4 py-2 hover:bg-cardano-blue transition-colors uppercase tracking-[0.1em] shrink-0"
          >
            ▶ <span className="hidden sm:inline">verify now</span>
            <span className="sm:hidden">verify</span>
          </Link>
        </div>
      </div>

      {/* Mobile: secondary nav row with key routes (only shown on small screens) */}
      <div className="sm:hidden border-t border-ink/30 px-4 py-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`transition-colors ${
              isActive(link.to)
                ? 'text-ink underline underline-offset-4 decoration-2'
                : 'text-ink-muted'
            }`}
            style={
              isActive(link.to) ? { textDecorationColor: '#0033AD' } : {}
            }
          >
            {link.shortLabel}
          </Link>
        ))}
      </div>
    </nav>
  )
}