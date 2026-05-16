# CertChain V2 — Living Context for Claude

> Living document. Paste this at the start of any new chat to give Claude full context.
> Last updated: 14/05/2026 (Day 3 — deadline corrected per official submission guide)

---

## 🎯 Project snapshot

**CertChain** — Blockchain-based certificate issuance and verification platform on Cardano.

- **Hackathon:** Cardano SEA Hackathon 2026 (solo, EdTech track)
- **Org:** Cardano2VN
- **Deadline:** Business Plan 18/05 23:59 · Slide Deck 19/05 23:59 · Final 26-27/05
- **GitHub:** `https://github.com/Hunny-17/certchain-cardano`
- **Prod URL:** `https://certchain-cardano.vercel.app` (Vercel)

---

## 🧱 Stack

**Frontend:** React 19 + Vite 6 + Tailwind v4 + TypeScript strict
**Routing:** React Router v6
**Wallet/TX:** Mesh.js 1.8.14 (backend serverless only)
**Cardano:** Preprod testnet via Blockfrost
**Backend:** Vercel serverless functions (`api/_lib/*` + `api/mint/execute.ts`)
**DB:** Supabase (certificates table)
**Crypto override:** libsodium-wrappers-sumo 0.7.13 (0.7.16 broken)
**Runtime:** Node 22 LTS (Node 24 breaks libsodium ESM)
**Design:** Brutalist editorial light · `#FAFAF7` bg · Instrument Serif + JetBrains Mono · accent `#0033AD` · English-only UI (serif font lacks VN diacritic support)

---

## 🔐 Key tx hashes (Preprod, all public)

| Milestone | Tx Hash | Date |
|---|---|---|
| M1 anchor (POC) | `fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851` | 04/05 |
| V2 anchor (API smoke) | `a3865e96...` | 13/05 |
| V2 claim (full UI flow, code ULHH2MM5) | `abd50c23...` | 13/05 |

Custody wallet balance: ~9999.8 tADA on Preprod (enough for ~50k more mints).

---

## 📂 File map quick reference

```
frontend/
├── src/
│   ├── lib/
│   │   ├── userRole.ts          # localStorage role + dispatchEvent
│   │   ├── useUserRole.ts       # Reactive hook (NEW Day 3)
│   │   ├── mintApi.ts           # Frontend → /api/mint/execute
│   │   ├── blockfrost.ts        # Verifier on-chain query
│   │   ├── credentialStore.ts   # localStorage mock credentials
│   │   ├── hashUtils.ts         # SHA-256 for privacy fields
│   │   └── userRole.ts.bak      # Day 3 backup
│   ├── pages/
│   │   ├── Landing.tsx          # / (Hero + RoleCards + ProofSection)
│   │   ├── IssuerPortal.tsx     # /issue (RoleGuard: university)
│   │   ├── Holder.tsx           # /holder (public for V1)
│   │   ├── Verifier.tsx         # /verify, /verify/:txHash (public)
│   │   └── Pitch.tsx            # /pitch (10-slide deck)
│   └── components/
│       ├── RoleGuard.tsx        # Route protection + role switcher screens
│       ├── RoleBadge.tsx        # Top-right floating role indicator
│       ├── RoleCards.tsx        # Landing 3-role section
│       ├── Hero.tsx             # Landing hero with role buttons
│       ├── Navbar.tsx           # Top nav (no auth)
│       ├── BulkIssueView.tsx    # CSV upload + bulk mint
│       └── VerifyResult.tsx     # Cert verification result card
├── api/                          # Vercel serverless functions
│   ├── _lib/
│   │   ├── supabase-admin.ts    # service_role client
│   │   ├── mesh-tx.ts           # Mesh.js tx builder
│   │   └── blockfrost-server.ts # Backend tx submit
│   ├── mint/
│   │   └── execute.ts           # POST /api/mint/execute
│   └── health.ts                # GET /api/health (custody balance)
└── (root has package.json, vite.config.ts, tsconfig.*, vercel.json)
```

---

## ✅ Day 3 progress (14/05)

```
✅ Phase 1   Vercel prod env vars setup (7 vars)         DONE 10:50
✅ Phase 2   Prod smoke test (mint, verify, end-to-end)  DONE 11:20
✅ Phase 2.5 Role state sync fix (6 files migrated)      DONE 16:30
🎯 Phase 3   V2 Vietnamese proposal                       NEXT
□  Phase 4   README V2 update                             Buffer
□  Phase 5   Verifier CIP-25 metadata parser              Stretch
```

### Phase 2.5 — Role state sync fix details

**Bug 1:** First role switch from Hero/RoleCards required F5 to render correct page
**Bug 2:** "Switch to University" button in AccessRestricted screen did nothing

**Root cause:** `useEffect(() => setRole(getUserRole()), [])` only fires on mount; misses later role changes.

**Fix:** New `useUserRole` hook subscribes to:
- In-tab: `ROLE_CHANGE_EVENT` custom event (dispatched by `setUserRole`)
- Cross-tab: native `storage` event

**Files modified:**
- `src/lib/userRole.ts` (added event dispatch in setUserRole/clearUserRole)
- `src/lib/useUserRole.ts` (NEW hook)
- `src/pages/IssuerPortal.tsx` (migrate)
- `src/pages/Holder.tsx` (migrate)
- `src/pages/Verifier.tsx` (migrate)
- `src/components/RoleGuard.tsx` (migrate)

**Commit:** Pushed after this chat closes.

---

## 🚨 Known gotchas (don't repeat)

1. **NEVER paste wallet mnemonic / service role key in chat** — Day 1 security incident. Copy directly from `.env` to Vercel UI.
2. **libsodium-wrappers-sumo:** lock to 0.7.13 via package.json overrides (0.7.16 broken).
3. **Node version:** 22 LTS only (Node 24 breaks libsodium ESM imports).
4. **Vercel CLI v53 buggy** with `index.html` middleware → use split processes (Vite :5173 + Vercel :3000) for local dev.
5. **Vercel skips files prefixed with `_`** → don't name endpoints `_anything.ts`.
6. **Camera API requires HTTPS or localhost** → QR scan only works on prod/localhost, not HTTP staging.
7. **Lucide v1.14+ removed brand icons** → use SVG inline for GitHub/Twitter etc.
8. **Smart quotes break JSX** → always straight quotes in code (paste from chat may have curly quotes).
9. **TypeScript tsconfig:** `baseUrl` deprecated warning (TS 7.0) but kept for `paths` alias to work. IDE shows red squiggle but build passes. Defer fix to Final.
10. **English UI only** — Instrument Serif font lacks Vietnamese diacritic glyphs.

---

## 🎯 Phase 3 — Round 2 Business Plan + Slide Deck (NEXT)

**Goal:** Write full Business Plan (7 sections per CSH2026 Round 2 guide) for hackathon submission 18/05. Slide Deck (3-min pitch) separate, due 19/05.

**Format/audience TBD** — needs answer to:
1. Submission format: PDF, Google Doc, or markdown on DoraHacks?
2. Audience: Cardano2VN judges (VN-native) or international?
3. Tone: academic formal or startup pitch?
4. V1 proposal template available to match style?
5. Word count strict?

**Proposed structure:**
```
1. Tóm tắt (Executive Summary)           ~100 chữ
2. Vấn đề (Problem Statement)            ~150 chữ
3. Giải pháp (Solution Overview)         ~200 chữ
4. Tiến độ V2 (Updates from V1)          ~300 chữ
   - Backend serverless architecture
   - Real on-chain mint flow (3 tx hashes)
   - Custody wallet management
5. Roadmap Final (26-27/05)              ~150 chữ
   - CIP-25 metadata parser
   - Wallet integration (CIP-30)
   - Smart contracts (revocation)
6. Tech stack + Architecture diagram     ~100 chữ
7. Tài liệu tham khảo                    ~50 chữ
```

---

## 🧠 Personal context (for tone)

- Vietnamese speaker, direct/correction-oriented communication
- CS student at Văn Hiến University (expected 2027, GPA ~3.0)
- Also working on **Healix** (Qwen AI Build Day Vietnam 2026) in parallel
- Prefers thorough complete outputs, flags issues promptly
- Solo developer for CertChain
- OS: Windows (PowerShell, not bash)

---

## 📋 Commands cheatsheet (Windows PowerShell)

```powershell
# Project root
cd C:\Users\ASUS\Documents\CERTCHAIN\certchain-starter\certchain\frontend

# Dev server
npm run dev                              # http://localhost:5173

# Clear Vite cache (PowerShell syntax)
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# Find files
findstr /S /I /M "pattern" src\*.tsx

# Git
git status
git add <files>
git commit -m "message"
git push                                 # Auto-redeploy Vercel
```

---

## 🎨 Design tokens

```css
--bg:           #FAFAF7    /* warm off-white */
--ink:          #000000    /* black text */
--ink-muted:    #6B6B6B    /* secondary text */
--cardano-blue: #0033AD    /* accent / CTA */
--success:      green-400  /* status dot */
--error:        #C53030    /* validation errors */

font-serif:  'Instrument Serif', serif       /* H1, H2 display */
font-mono:   'JetBrains Mono', monospace     /* meta, code, UI labels */
font-sans:   default system stack             /* body text */
```

---

## 🚀 Use this file

Paste this file at the start of any new chat with Claude. Claude will use it to:
- Skip re-asking about stack, decisions, history
- Reference exact tx hashes, env vars, file paths
- Match design tone for new UI components
- Follow conventions (PowerShell, Vietnamese, etc.)
- Continue work without re-explaining context
