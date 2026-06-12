import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect back to the page that triggered the login, or /issue by default
  const from = (location.state as { from?: string })?.from ?? "/issue";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black">
      <Navbar />

      <div className="border-b border-black px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto font-mono text-[10px] md:text-xs text-black/50 uppercase tracking-[0.15em]">
          → Issuer Login · Universities Only
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 py-16">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № Issuer Portal
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-4xl md:text-5xl leading-[0.95] mb-10"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          Sign in to
          <br />
          <em className="italic text-[#0033AD]">issue credentials</em>.
        </h1>

        {error && (
          <div className="border-2 border-red-600 bg-red-50 p-4 mb-6">
            <p className="font-mono text-xs text-red-700 break-words">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 mb-2">
              Institutional email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border-2 border-black px-4 py-3 bg-white font-mono text-sm focus:outline-none focus:border-[#0033AD] transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border-2 border-black px-4 py-3 bg-white font-mono text-sm focus:outline-none focus:border-[#0033AD] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-black bg-black text-[#FAFAF7] px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-[#0033AD] hover:border-[#0033AD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>

        <p className="mt-10 font-mono text-[10px] text-black/40 uppercase tracking-[0.15em] text-center leading-relaxed">
          No account?
          <br />
          Contact your institution admin to get access.
        </p>
      </main>
    </div>
  );
}
