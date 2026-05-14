import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "../components/Navbar";
import {
  listMockCredentials,
  type StoredMockCredential,
} from "../lib/credentialStore";
import { useUserRole } from "../lib/useUserRole";
import RoleBadge from "../components/RoleBadge";

// ============================================================================
// Holder.tsx — Student Wallet (V1 Lite)
// ----------------------------------------------------------------------------
// Reads credentials issued via the Issuer Portal (stored in localStorage),
// renders each as a shareable card with QR + verifier link + actions.
//
// V1 limitations (disclosed in UI):
//   - Per-device wallet (localStorage). Cross-device sync = V2 with CIP-30.
//   - Read-only of mock credentials. Real on-chain ownership = V2.
// ============================================================================

const M1_DEMO_TX =
  "fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851";

export default function Holder() {
  const [credentials, setCredentials] = useState<StoredMockCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = useUserRole();
  useEffect(() => {
    // Small artificial delay so the loading state is visible — feels intentional
    const t = setTimeout(() => {
      const all = listMockCredentials();
      // Sort newest first
      all.sort((a, b) => b._issuedAt - a._issuedAt);
      setCredentials(all);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black">
      <Navbar />
      <RoleBadge role={userRole} />

      {/* ============== Status strip ============== */}
      <div className="border-b border-ink px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-[10px] md:text-xs text-ink-muted uppercase tracking-[0.15em]">
          → Holder Wallet · For Students · Local Storage (V1)
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10 md:py-16">
        {/* ============== Header ============== */}
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № 03 · Holder
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          My credentials.
          <br />
          <em className="italic text-[#0033AD]">Always with me</em>.
        </h1>
        <p className="text-sm md:text-base text-black/60 mb-12 max-w-2xl leading-relaxed">
          Every credential anchored on Cardano. Share with employers via QR or
          link — verification happens directly against the blockchain, not
          through us.
        </p>

        {/* ============== Content ============== */}
        {loading ? (
          <LoadingState />
        ) : credentials.length === 0 ? (
          <EmptyState />
        ) : (
          <CredentialsList credentials={credentials} />
        )}
      </main>

      {/* ============== Footer ============== */}
      <footer className="border-t-2 border-black mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-3 flex items-center justify-between text-[9px] md:text-[10px] uppercase tracking-[0.15em] gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <span className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-[#0033AD] inline-block" />
              Local Wallet · V1
            </span>
            <span className="text-black/40 hidden sm:inline">
              CIP-30 wallet → V2 milestone
            </span>
          </div>
          <span className="text-black/40 shrink-0">localStorage</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// Loading state
// ============================================================================
function LoadingState() {
  return (
    <div className="border-2 border-black p-8 md:p-12 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-3">
        ⟳ Loading wallet
      </div>
      <p className="text-sm text-black/60">Reading from local storage...</p>
    </div>
  );
}

// ============================================================================
// Empty state — first-time user
// ============================================================================
function EmptyState() {
  return (
    <div className="border-2 border-black bg-white">
      <div className="p-8 md:p-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
          [ Empty wallet ]
        </div>
        <h2
          className="text-3xl md:text-5xl leading-tight mb-6 max-w-2xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          You don't have any credentials yet.
        </h2>
        <p className="text-sm md:text-base text-black/60 mb-10 max-w-xl leading-relaxed">
          Credentials appear here automatically once your university issues
          them through CertChain. For demo purposes, you can also issue one
          to yourself via the Issuer Portal.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
          <Link
            to="/issue"
            className="border-2 border-black px-5 py-4 hover:bg-black hover:text-[#FAFAF7] transition-colors"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 group-hover:text-white/70 mb-1">
              Demo
            </div>
            <div className="text-base flex items-center justify-between">
              <span style={{ fontFamily: "'Instrument Serif', serif" }}>
                Issue one to yourself
              </span>
              <span>→</span>
            </div>
          </Link>
          <Link
            to={`/verify/${M1_DEMO_TX}`}
            className="px-5 py-4 transition-colors hover:opacity-90"
            style={{ background: "#0033AD", color: "#FAFAF7" }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">
              Try first
            </div>
            <div className="text-base flex items-center justify-between">
              <span style={{ fontFamily: "'Instrument Serif', serif" }}>
                See M1 demo credential
              </span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Credentials list
// ============================================================================
function CredentialsList({
  credentials,
}: {
  credentials: StoredMockCredential[];
}) {
  return (
    <>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
          {credentials.length}{" "}
          {credentials.length === 1 ? "credential" : "credentials"}
        </span>
        <span className="h-px flex-1 bg-black/20" />
        <Link
          to="/issue"
          className="text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-[#0033AD] transition-colors"
        >
          + Issue another
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {credentials.map((cred) => (
          <CredentialCard key={cred.txHash} credential={cred} />
        ))}
      </div>
    </>
  );
}

// ============================================================================
// Single credential card
// ============================================================================
function CredentialCard({ credential }: { credential: StoredMockCredential }) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${credential.txHash}`
      : `https://certchain-cardano.vercel.app/verify/${credential.txHash}`;

  const issuedDate = new Date(credential._issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: ignore
    }
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${credential.credentialTitle} · CertChain`,
          text: `Verify my credential: ${credential.credentialTitle} from ${credential.institution}`,
          url: verifyUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="border-2 border-black bg-white relative">
      {/* corner ticks for receipt aesthetic */}
      <div className="absolute top-2 left-2 w-2 h-2 border-l-2 border-t-2 border-black" />
      <div className="absolute top-2 right-2 w-2 h-2 border-r-2 border-t-2 border-black" />

      {/* Top — credential summary */}
      <div className="p-5 md:p-6 border-b-2 border-black">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-black/50 mb-1">
              {credential.credentialType}
            </div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-black/40">
              {credential.institution}
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#0033AD] border border-[#0033AD] px-2 py-1 shrink-0">
            ✓ On-chain
          </span>
        </div>
        <div
          className="text-xl md:text-2xl leading-tight mb-3"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {credential.credentialTitle}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
          Issued · {issuedDate}
        </div>
      </div>

      {/* Middle — QR (collapsible) */}
      {showQR && (
        <div className="p-5 md:p-6 border-b-2 border-black bg-[#FAFAF7] flex flex-col items-center">
          <div className="bg-white p-3 border-2 border-black">
            <QRCodeSVG
              value={verifyUrl}
              size={160}
              level="H"
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>
          <div className="mt-3 text-[9px] uppercase tracking-[0.2em] text-black/50 text-center">
            Scan to verify on Cardano
          </div>
        </div>
      )}

      {/* Bottom — actions */}
      <div className="grid grid-cols-3 divide-x-2 divide-black">
        <button
          onClick={() => setShowQR((v) => !v)}
          className="px-3 py-3 text-[10px] uppercase tracking-[0.15em] hover:bg-black hover:text-[#FAFAF7] transition-colors"
        >
          {showQR ? "Hide QR" : "Show QR"}
        </button>
        <button
          onClick={copyLink}
          className="px-3 py-3 text-[10px] uppercase tracking-[0.15em] hover:bg-black hover:text-[#FAFAF7] transition-colors"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <Link
          to={`/verify/${credential.txHash}`}
          className="px-3 py-3 text-[10px] uppercase tracking-[0.15em] text-center transition-colors"
          style={{ background: "#0033AD", color: "#FAFAF7" }}
        >
          Verify →
        </Link>
      </div>

      {/* Native share (mobile only) */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={shareNative}
          className="block w-full border-t-2 border-black py-3 text-[10px] uppercase tracking-[0.15em] text-black/60 hover:text-black hover:bg-[#FAFAF7] transition-colors"
        >
          ↑ Share via system
        </button>
      )}
    </div>
  );
}