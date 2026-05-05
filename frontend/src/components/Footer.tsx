export default function Footer() {
  return (
    <footer className="border-t border-ink">
      <div className="max-w-7xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 font-mono text-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3" style={{ background: '#0033AD' }} />
            <span className="font-medium">CERTCHAIN/v0.1</span>
          </div>
          <div className="text-ink-muted">© 2026 · MIT License · Built solo for Cardano SEA Hackathon 2026</div>
        </div>

        <div className="text-ink-muted">
          <div className="uppercase tracking-widest text-[10px] mb-2">Stack</div>
          <div>React 19 · Mesh.js · Cardano · Qwen-VL</div>
        </div>

        <div className="md:text-right">
          <a href="https://github.com/Hunny-17/certchain-cardano" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-cardano-blue transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            github · Hunny-17/certchain-cardano →
          </a>
        </div>
      </div>
    </footer>
  )
}