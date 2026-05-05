import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="border-b border-ink bg-bg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-4 h-4" style={{ background: '#0033AD' }} />
          <span className="font-mono font-medium text-sm tracking-tight">CERTCHAIN/v0.1</span>
        </Link>

        <div className="flex items-center gap-6 font-mono text-xs">
          <a href="#how" className="hidden sm:inline hover:text-cardano-blue transition-colors">[01] index</a>
          <a href="#proof" className="hidden sm:inline text-ink-muted hover:text-ink transition-colors">[02] proof</a>
          <Link to="/verify" className="bg-ink text-bg px-4 py-2 hover:bg-cardano-blue transition-colors">
            ▶ verify now
          </Link>
        </div>
      </div>
    </nav>
  )
}