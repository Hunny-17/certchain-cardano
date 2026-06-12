import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

export default function PendingVerification() {
  const { user, university, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black">
      <Navbar />

      <div className="border-b border-black px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-[10px] text-black/50 uppercase tracking-[0.15em]">
          → Account Pending · Awaiting Admin Verification
        </div>
      </div>

      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="border-2 border-black bg-white">
          <div className="h-1" style={{ background: "#B8860B" }} />
          <div className="p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
              ⧗ Pending verification
            </div>
            <h1
              className="text-3xl md:text-4xl leading-tight mb-4"
              style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
            >
              Your account is under review.
            </h1>
            <p className="text-sm text-black/60 mb-8 leading-relaxed">
              A CertChain admin needs to verify your institution before you can
              issue credentials. This usually takes less than 24 hours.
            </p>

            <div className="border border-black/20 p-4 mb-8 space-y-2">
              {user?.email && (
                <div className="font-mono text-xs text-black/60">
                  <span className="uppercase tracking-[0.15em] text-black/40">Account · </span>
                  {user.email}
                </div>
              )}
              {university?.name && (
                <div className="font-mono text-xs text-black/60">
                  <span className="uppercase tracking-[0.15em] text-black/40">Institution · </span>
                  {university.name}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={signOut}
              className="border-2 border-black px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
