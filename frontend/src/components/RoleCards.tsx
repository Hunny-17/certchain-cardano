const roles = [
  {
    num: '01',
    title: 'Issuer',
    role: 'University',
    description: 'Sign and issue credentials directly on-chain. Bulk digitize legacy diplomas via Qwen-VL OCR.',
    isAccent: false,
  },
  {
    num: '02',
    title: 'Holder',
    role: 'Student',
    description: 'Own credentials as portable QR codes. Share with employers via link or scan. No platform lock-in.',
    isAccent: true,
  },
  {
    num: '03',
    title: 'Verifier',
    role: 'Employer',
    description: 'Scan QR. Get instant authenticity check from Cardano blockchain. No login. No paperwork.',
    isAccent: false,
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
          Three roles. <em className="italic" style={{ color: '#0033AD' }}>One</em> blockchain. <em className="italic">Zero</em> trust gaps.
        </h2>

        <div className="grid md:grid-cols-3 border-t border-ink">
          {roles.map((role) => (
            <div
              key={role.num}
              className={`border-r border-ink last:border-r-0 p-8 group relative overflow-hidden transition-colors ${role.isAccent ? '' : 'hover:bg-ink hover:text-bg'}`}
              style={role.isAccent ? { background: '#0033AD', color: '#FAFAF7' } : {}}
            >
              <div className="font-mono text-xs mb-12 opacity-60">[{role.num}]</div>
              <div className="font-mono text-xs uppercase tracking-widest mb-3 opacity-70">{role.role}</div>
              <h3 className="font-serif text-5xl mb-6">{role.title}</h3>
              <p className={`text-base leading-relaxed ${role.isAccent ? 'opacity-90' : 'text-ink-muted group-hover:text-bg/80'}`}>
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}