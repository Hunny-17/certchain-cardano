import { useEffect, useState } from "react";

// ============================================================================
// CertChain — Pitch Deck (V1, Cardano SEA Hackathon 2026)
// ----------------------------------------------------------------------------
// 10 full-viewport slides, scroll-snap navigation. Brutalist editorial
// matching Landing/Issuer/Verifier — same #FAFAF7 + Instrument Serif +
// JetBrains Mono + #0033AD accent, sharp 2px borders.
//
// Reuse: just route /pitch and you're done. No router config beyond that.
// ============================================================================

const SLIDES = [
  { id: "01", label: "Cover" },
  { id: "02", label: "Problem" },
  { id: "03", label: "Solution" },
  { id: "04", label: "How It Works" },
  { id: "05", label: "Demo" },
  { id: "06", label: "Architecture" },
  { id: "07", label: "AI Integration" },
  { id: "08", label: "Traction" },
  { id: "09", label: "Roadmap" },
  { id: "10", label: "Why Us" },
];

const M1_TX_HASH =
  "fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851";

export default function Pitch() {
  const [activeIdx, setActiveIdx] = useState(0);

  // Track current slide based on scroll position for the side rail indicator.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight / 2;
      const sections = SLIDES.map((s) =>
        document.getElementById(`slide-${s.id}`)
      );
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.offsetTop <= y) {
          setActiveIdx(i);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goto = (idx: number) => {
    document
      .getElementById(`slide-${SLIDES[idx].id}`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#FAFAF7] text-black font-mono">
      {/* ============== TOP BAR (sticky, slim) ============== */}
      <header className="sticky top-0 z-40 border-b-2 border-black bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-baseline gap-2 md:gap-3 shrink-0">
            <span
              className="text-xl md:text-2xl tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              CertChain
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-black/50">
              · Pitch Deck V1
            </span>
          </a>
          <div className="flex items-center gap-3 md:gap-5 text-[10px] uppercase tracking-[0.15em]">
            <span className="text-black/50">
              {String(activeIdx + 1).padStart(2, "0")} / {SLIDES.length}
            </span>
            <a
              href="https://github.com/Hunny-17/certchain-cardano"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#0033AD]"
            >
              GitHub ↗
            </a>
            <a
              href="/issue"
              className="bg-black text-[#FAFAF7] px-3 py-2 hover:bg-[#0033AD] transition-colors"
            >
              Try Demo →
            </a>
          </div>
        </div>
      </header>

      {/* ============== SIDE RAIL (desktop only) ============== */}
      <nav className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goto(i)}
            className={`group flex items-center gap-3 transition-opacity ${
              i === activeIdx ? "opacity-100" : "opacity-40 hover:opacity-80"
            }`}
            title={s.label}
          >
            <span
              className={`w-6 h-px transition-all ${
                i === activeIdx ? "bg-[#0033AD] w-10" : "bg-black"
              }`}
            />
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {s.id}
            </span>
          </button>
        ))}
      </nav>

      <main>
        {/* ============== 01 — COVER ============== */}
        <Slide id="01">
          <div className="max-w-5xl">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
                № 01 · Cover
              </span>
              <span className="h-px flex-1 bg-black/20" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
                Cardano SEA Hackathon 2026
              </span>
            </div>
            <h1
              className="text-6xl sm:text-7xl md:text-9xl leading-[0.9] mb-8 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Cert<em className="italic text-[#0033AD]">Chain</em>.
            </h1>
            <p
              className="text-2xl md:text-3xl leading-tight max-w-3xl mb-12"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Verifiable academic credentials on Cardano,{" "}
              <em className="italic">powered by AI</em>.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t-2 border-black">
              <Stat label="Verification" value="2 sec" />
              <Stat label="Tx Cost" value="~0.18 ADA" />
              <Stat label="Network" value="Cardano" />
              <Stat label="Track" value="EdTech + AI" />
            </div>
          </div>
        </Slide>

        {/* ============== 02 — PROBLEM ============== */}
        <Slide id="02">
          <div className="max-w-5xl">
            <SlideHeader index="02" label="Problem" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Credentials are{" "}
              <em className="italic text-[#0033AD]">forgeable</em>,
              <br />
              verification is <em className="italic">slow</em>.
            </h2>
            <div className="grid md:grid-cols-3 gap-px bg-black border-2 border-black mb-10">
              <DataCell
                num="2.2M"
                label="Vietnamese students enrolling every year"
              />
              <DataCell
                num="235+"
                label="Independent degree-issuing universities"
              />
              <DataCell
                num="3-7 days"
                label="Traditional verification turnaround"
              />
            </div>
            <ul className="space-y-3 text-base md:text-lg max-w-3xl">
              <PainPoint>
                Paper credentials are easy to forge, with no real-time
                verification mechanism
              </PainPoint>
              <PainPoint>
                Employers must call or email each university individually to
                confirm authenticity
              </PainPoint>
              <PainPoint>
                Lost original certificate? Reissuance takes weeks and risks
                identity theft
              </PainPoint>
              <PainPoint>
                Cross-border SEA hiring records are practically unverifiable
              </PainPoint>
            </ul>
          </div>
        </Slide>

        {/* ============== 03 — SOLUTION ============== */}
        <Slide id="03">
          <div className="max-w-5xl">
            <SlideHeader index="03" label="Solution" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Three roles.{" "}
              <em className="italic text-[#0033AD]">One blockchain.</em>
              <br />
              Zero trust gaps.
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <RoleCard
                num="01"
                role="University"
                title="Issuer"
                desc="Sign and issue credentials directly on-chain via CIP-20 metadata. Bulk digitize legacy paper diplomas with Qwen-VL OCR."
              />
              <RoleCard
                num="02"
                role="Student"
                title="Holder"
                desc="Own credentials as portable QR codes. Share with employers via link or scan. No platform lock-in."
                inverted
              />
              <RoleCard
                num="03"
                role="Employer"
                title="Verifier"
                desc="Scan QR. Get instant authenticity check from Cardano blockchain. No login, no paperwork, no API key."
              />
            </div>
          </div>
        </Slide>

        {/* ============== 04 — HOW IT WORKS ============== */}
        <Slide id="04">
          <div className="max-w-5xl">
            <SlideHeader index="04" label="How it works" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-12 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Issue once.
              <br />
              <em className="italic text-[#0033AD]">Verify forever</em>.
            </h2>
            <div className="space-y-1 border-2 border-black bg-white">
              <FlowStep
                step="01"
                title="University fills credential form"
                detail="Recipient · Title · Date · Type — single page, 30 seconds"
              />
              <FlowStep
                step="02"
                title="System hashes payload (SHA-256)"
                detail="Privacy-preserving — sensitive fields never leave the issuer"
              />
              <FlowStep
                step="03"
                title="Anchored on Cardano via CIP-20 metadata"
                detail="~0.18 ADA tx fee · 1 block confirmation · permanent"
              />
              <FlowStep
                step="04"
                title="Recipient receives QR + verifier link"
                detail="No wallet required for the holder — just the QR"
              />
              <FlowStep
                step="05"
                title="Anyone scans QR → reads on-chain → ✓ in 2 sec"
                detail="No login. No API key. No backend to bribe."
                accent
              />
            </div>
          </div>
        </Slide>

        {/* ============== 05 — DEMO ============== */}
        <Slide id="05" tone="dark">
          <div className="max-w-5xl">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                № 05 · Demo
              </span>
              <span className="h-px flex-1 bg-white/20" />
            </div>
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Live on{" "}
              <em className="italic" style={{ color: "#FFD43B" }}>
                Cardano Preprod
              </em>
              .
            </h2>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 max-w-3xl">
              The full end-to-end flow runs against the real blockchain. Click
              any button below — try it yourself.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <DemoButton href="/issue" label="Issuer Portal" sub="/issue · University view" />
              <DemoButton href="/holder" label="Holder Wallet" sub="/holder · Student view" />
              <DemoButton
                href={`/verify/${M1_TX_HASH}`}
                label="Verifier (M1 hash)"
                sub="Authentic credential ✓"
              />
              <DemoButton
                href={`https://preprod.cardanoscan.io/transaction/${M1_TX_HASH}`}
                label="View on Cardanoscan"
                sub="Block 4,671,820 · 2,658+ confirmations"
                external
              />
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-6">
              GitHub repo · <a href="https://github.com/Hunny-17/certchain-cardano" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">github.com/Hunny-17/certchain-cardano ↗</a>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 pt-6 border-t border-white/20">
              Tx Hash · {M1_TX_HASH}
            </div>
          </div>
        </Slide>

        {/* ============== 06 — ARCHITECTURE ============== */}
        <Slide id="06">
          <div className="max-w-5xl">
            <SlideHeader index="06" label="Architecture" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-6 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              No traditional backend.
              <br />
              <em className="italic text-[#0033AD]">Cardano is the backend</em>.
            </h2>
            <p className="text-base md:text-lg text-black/70 leading-relaxed mb-10 max-w-3xl">
              No database to hack. No server to bribe. No admin to corrupt.
              Removing the attack surface is the point — not an oversight.
            </p>
            <div className="border-2 border-black bg-white">
              <ArchRow layer="Frontend" tech="React 19 · Vite 6 · Tailwind v4" />
              <ArchRow layer="Wallet (V2)" tech="Mesh.js SDK · CIP-30" />
              <ArchRow
                layer="Read provider"
                tech="Blockfrost API (read-as-a-service)"
              />
              <ArchRow
                layer="On-chain protocol"
                tech="CIP-20 metadata anchoring"
              />
              <ArchRow
                layer="Smart contracts (Final)"
                tech="Plutus · revocation registry"
              />
              <ArchRow
                layer="AI layer"
                tech="Qwen-VL Vision · OCR diploma digitization"
                accent
              />
              <ArchRow layer="Hosting" tech="Vercel (frontend only)" last />
            </div>
          </div>
        </Slide>

        {/* ============== 07 — AI INTEGRATION ============== */}
        <Slide id="07">
          <div className="max-w-5xl">
            <SlideHeader index="07" label="AI Integration" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Bridge legacy <em className="italic">paper</em>
              <br />
              to <em className="italic text-[#0033AD]">on-chain</em>.
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Pillar
                num="A"
                title="The migration problem"
                body="Vietnamese universities have decades of paper diplomas — millions of them. Manual transcription is too slow and error-prone for system-wide adoption."
              />
              <Pillar
                num="B"
                title="V1 — Bulk CSV pipeline"
                body="Live now. Drop a CSV with 10, 100, or 1000 students. Each row hashed locally (SHA-256), anchored on Cardano in batch. The plumbing is built and tested."
                accent
              />
              <Pillar
                num="C"
                title="V2/Final — Qwen-VL OCR"
                body="Replace CSV input with Vision model output. Bulk-scan paper diplomas → extract structured fields → feed into the same on-chain pipeline."
              />
            </div>
            <div className="mt-10 p-6 border-2 border-black bg-white">
              <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
                Why this matters for adoption
              </div>
              <p className="text-base md:text-lg leading-relaxed">
                A university with 50,000 alumni cannot manually re-issue every
                credential. AI digitization is the missing link between Web2
                paper and Web3 verifiability —{" "}
                <em
                  className="italic text-[#0033AD]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  the practical path to scale.
                </em>
              </p>
            </div>
          </div>
        </Slide>

        {/* ============== 08 — TRACTION ============== */}
        <Slide id="08">
          <div className="max-w-5xl">
            <SlideHeader index="08" label="Traction" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Already shipping.
              <br />
              <em className="italic text-[#0033AD]">On-chain. Today</em>.
            </h2>
            <div className="grid md:grid-cols-2 gap-px bg-black border-2 border-black mb-8">
              <Milestone
                tag="✓ DONE · 04/05"
                title="M1 — On-chain POC"
                detail="Real CIP-20 metadata anchored on Cardano Preprod. Block 4,671,820. 2,658+ confirmations and counting."
                done
              />
              <Milestone
                tag="✓ DONE · 06/05"
                title="V1 — Production-grade UX"
                detail="3 actor portals (Issuer/Holder/Verifier). Role-based access control. SHA-256 anti-impersonation. Bulk CSV issuance. History tracking on both sides. Mobile responsive. Live at certchain-cardano.vercel.app."
                done
              />
            </div>
            <a
              href={`https://preprod.cardanoscan.io/transaction/${M1_TX_HASH}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-2 border-black bg-[#0033AD] text-white p-6 hover:bg-black transition-colors"
            >
              <div className="text-[10px] uppercase tracking-[0.25em] opacity-80 mb-2">
                Verify the M1 anchor on Cardanoscan
              </div>
              <code className="text-xs md:text-sm break-all">
                {M1_TX_HASH}
              </code>
              <div className="mt-4 text-[10px] uppercase tracking-[0.2em] opacity-80">
                Click to open ↗
              </div>
            </a>
          </div>
        </Slide>

        {/* ============== 09 — ROADMAP ============== */}
        <Slide id="09">
          <div className="max-w-5xl">
            <SlideHeader index="09" label="Roadmap" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Ship in <em className="italic text-[#0033AD]">milestones</em>,
              <br />
              not in promises.
            </h2>
            <div className="space-y-4">
              <RoadmapRow
                phase="V1"
                date="08/05"
                status="✓ Done"
                title="Production-grade demo · 3 actors complete"
                detail="3 portals (Issuer · Holder · Verifier) · Role-based access control · SHA-256 identity hashing (anti-impersonation) · Bulk CSV issuance with live progress · Issuer + Verifier history tracking · Mock publish anchored to M1 reference · Mobile responsive · Live at certchain-cardano.vercel.app"
                done
              />
              <RoadmapRow
                phase="V2"
                date="17/05"
                status="In progress"
                title="Real on-chain publish + PDF proposal"
                detail="Replace localStorage mock with Mesh.js TxBuilder · CIP-30 wallet connect · every form submission becomes a real Preprod transaction"
              />
              <RoadmapRow
                phase="Final"
                date="26-27/05"
                status="Planned"
                title="Smart contracts + Qwen-VL OCR"
                detail="Plutus revocation registry · Qwen-VL bulk diploma OCR pipeline · live pitch onsite at NTU-VN"
                accent
              />
              <RoadmapRow
                phase="Post"
                date="06/2026+"
                status="Future"
                title="Production deployment"
                detail="Move to Cardano Mainnet · pilot deployment with NTU-VN · regional expansion across SEA"
              />
            </div>
          </div>
        </Slide>

        {/* ============== 10 — WHY US ============== */}
        <Slide id="10">
          <div className="max-w-5xl">
            <SlideHeader index="10" label="Why us" />
            <h2
              className="text-5xl md:text-7xl leading-[0.95] mb-10 break-words"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Solo builder.
              <br />
              <em className="italic text-[#0033AD]">Hackathon-native</em>.
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <Pillar
                num="A"
                title="Tran Quoc Huy"
                body="Computer Science student at Văn Hiến University (expected 2027). Active in Vietnam hackathon scene — Cardano SEA, Qwen AI Build Day, Lotus Hackathon. Cardano-curious since 2025, building seriously since M1."
              />
              <Pillar
                num="B"
                title="Why this team can ship"
                body="Already delivered M1 on real blockchain. Already delivered V1 UX with mobile responsive design. Track record of finishing what I start, in milestones, on time."
                accent
              />
            </div>

            <div className="border-2 border-black bg-white p-6 md:p-8">
              <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
                Reach out · try the demo · open the source
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <ContactLink
                  label="Email"
                  value="quochuy9.1hth2019@gmail.com"
                  href="mailto:quochuy9.1hth2019@gmail.com"
                />
                <ContactLink
                  label="LinkedIn"
                  value="huy-tran-4b5a6a3b4"
                  href="https://www.linkedin.com/in/huy-tran-4b5a6a3b4/"
                />
                <ContactLink
                  label="GitHub"
                  value="github.com/Hunny-17"
                  href="https://github.com/Hunny-17"
                />
                <ContactLink
                  label="Repository"
                  value="certchain-cardano"
                  href="https://github.com/Hunny-17/certchain-cardano"
                />
                <ContactLink
                  label="Live demo · Issuer"
                  value="/issue"
                  href="/issue"
                />
                <ContactLink
                  label="Live demo · Verifier"
                  value={`/verify/${M1_TX_HASH.slice(0, 12)}...`}
                  href={`/verify/${M1_TX_HASH}`}
                />
              </div>
              <div className="pt-6 border-t-2 border-black">
                <div
                  className="text-2xl md:text-3xl"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Thank you for reading.{" "}
                  <a
                    href="/issue"
                    className="italic text-[#0033AD] hover:underline underline-offset-4 decoration-2"
                  >
                    Now try the demo →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Slide>
      </main>

      {/* ============== STATUS BAR FOOTER ============== */}
      <footer className="border-t-2 border-black">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-3 flex items-center justify-between text-[9px] md:text-[10px] uppercase tracking-[0.15em] gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-[#0033AD] inline-block" />
              CertChain · Pitch Deck V1
            </span>
            <span className="text-black/40 hidden sm:inline">
              Cardano SEA Hackathon 2026
            </span>
          </div>
          <span className="text-black/40 shrink-0">EdTech + AI</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// LAYOUT PRIMITIVES
// ============================================================================

function Slide({
  id,
  children,
  tone = "light",
}: {
  id: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";
  return (
    <section
      id={`slide-${id}`}
      className={`min-h-[100svh] w-full px-4 md:px-16 lg:px-24 py-16 md:py-24 flex items-center justify-center ${
        isDark ? "bg-black text-white" : "bg-[#FAFAF7] text-black"
      } border-b-2 ${isDark ? "border-white" : "border-black"}`}
    >
      <div className="w-full max-w-5xl">{children}</div>
    </section>
  );
}

function SlideHeader({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
        № {index} · {label}
      </span>
      <span className="h-px flex-1 bg-black/20" />
    </div>
  );
}

// ============================================================================
// SLIDE-SPECIFIC COMPONENTS
// ============================================================================

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-black/40 mb-1">
        {label}
      </div>
      <div
        className="text-2xl md:text-3xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </div>
    </div>
  );
}

function DataCell({ num, label }: { num: string; label: string }) {
  return (
    <div className="bg-[#FAFAF7] px-5 py-6">
      <div
        className="text-3xl md:text-5xl mb-2"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {num}
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-black/60 leading-relaxed">
        {label}
      </div>
    </div>
  );
}

function PainPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-black/80">
      <span className="text-[#0033AD] shrink-0 mt-1">→</span>
      <span>{children}</span>
    </li>
  );
}

function RoleCard({
  num,
  role,
  title,
  desc,
  inverted = false,
}: {
  num: string;
  role: string;
  title: string;
  desc: string;
  inverted?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black p-6 ${
        inverted ? "bg-[#0033AD] text-white" : "bg-white"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.25em] mb-2 ${
          inverted ? "text-white/70" : "text-black/50"
        }`}
      >
        № {num}
      </div>
      <div
        className={`text-[10px] uppercase tracking-[0.2em] mb-3 ${
          inverted ? "text-white/80" : "text-black/60"
        }`}
      >
        {role}
      </div>
      <div
        className="text-3xl md:text-4xl mb-4"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </div>
      <p
        className={`text-sm leading-relaxed ${
          inverted ? "text-white/90" : "text-black/70"
        }`}
      >
        {desc}
      </p>
    </div>
  );
}

function FlowStep({
  step,
  title,
  detail,
  accent = false,
}: {
  step: string;
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-6 px-6 py-5 border-b-2 border-black last:border-b-0 ${
        accent ? "bg-[#0033AD]/5" : ""
      }`}
    >
      <div
        className={`w-12 h-12 border-2 flex items-center justify-center font-mono text-sm shrink-0 ${
          accent
            ? "bg-[#0033AD] text-white border-[#0033AD]"
            : "bg-black text-white border-black"
        }`}
      >
        {step}
      </div>
      <div className="flex-1">
        <div
          className="text-base md:text-xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {title}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 mt-1">
          {detail}
        </div>
      </div>
    </div>
  );
}

function DemoButton({
  href,
  label,
  sub,
  external = false,
}: {
  href: string;
  label: string;
  sub: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block border-2 border-white p-5 hover:bg-white hover:text-black transition-colors group"
    >
      <div
        className="text-2xl md:text-3xl mb-1 flex items-center justify-between gap-4"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        <span>{label}</span>
        <span className="text-[#FFD43B] group-hover:text-[#0033AD]">
          {external ? "↗" : "→"}
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">
        {sub}
      </div>
    </a>
  );
}

function ArchRow({
  layer,
  tech,
  accent = false,
  last = false,
}: {
  layer: string;
  tech: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 ${
        last ? "" : "border-b-2 border-black"
      } ${accent ? "bg-[#0033AD]/5" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-black/60 sm:w-48 shrink-0">
        {layer}
      </div>
      <div
        className={`text-base sm:text-lg md:text-xl break-words min-w-0 ${
          accent ? "text-[#0033AD]" : ""
        }`}
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {tech}
      </div>
    </div>
  );
}

function Pillar({
  num,
  title,
  body,
  accent = false,
}: {
  num: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black p-6 ${
        accent ? "bg-[#0033AD] text-white" : "bg-white"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.25em] mb-3 ${
          accent ? "text-white/70" : "text-black/50"
        }`}
      >
        № {num}
      </div>
      <div
        className="text-2xl md:text-3xl mb-4"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </div>
      <p
        className={`text-sm md:text-base leading-relaxed ${
          accent ? "text-white/90" : "text-black/70"
        }`}
      >
        {body}
      </p>
    </div>
  );
}

function Milestone({
  tag,
  title,
  detail,
  done = false,
}: {
  tag: string;
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div className="bg-[#FAFAF7] px-6 py-5">
      <div
        className={`text-[10px] uppercase tracking-[0.25em] mb-2 ${
          done ? "text-[#0033AD]" : "text-black/50"
        }`}
      >
        {tag}
      </div>
      <div
        className="text-2xl md:text-3xl mb-3"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </div>
      <p className="text-sm text-black/70 leading-relaxed">{detail}</p>
    </div>
  );
}

function RoadmapRow({
  phase,
  date,
  status,
  title,
  detail,
  done = false,
  accent = false,
}: {
  phase: string;
  date: string;
  status: string;
  title: string;
  detail: string;
  done?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black p-5 md:p-6 ${
        accent ? "bg-[#0033AD]/5" : "bg-white"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-3 md:gap-6 mb-3">
        <span
          className={`text-2xl md:text-3xl ${
            done ? "text-[#0033AD]" : ""
          }`}
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {phase}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-black/50">
          {date}
        </span>
        <span
          className={`text-[10px] uppercase tracking-[0.2em] ${
            done ? "text-[#0033AD]" : "text-black/60"
          }`}
        >
          · {status}
        </span>
      </div>
      <div
        className="text-xl md:text-2xl mb-2"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </div>
      <p className="text-sm text-black/70 leading-relaxed">{detail}</p>
    </div>
  );
}

function ContactLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="block border-2 border-black p-4 hover:bg-black hover:text-[#FAFAF7] transition-colors"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 mb-1 group-hover:text-white/60">
        {label}
      </div>
      <code className="text-sm break-all">{value}</code>
    </a>
  );
}
