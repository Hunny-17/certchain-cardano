import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black">
      <Navbar />

      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="border-2 border-black bg-white">
          <div className="h-1" style={{ background: "#C53030" }} />
          <div className="p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
              ✕ 403 · Unauthorized
            </div>
            <h1
              className="text-3xl md:text-4xl leading-tight mb-4"
              style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
            >
              Access denied.
            </h1>
            <p className="text-sm text-black/60 mb-8 leading-relaxed">
              You don't have permission to access this page. Contact your
              institution admin if you think this is a mistake.
            </p>
            <Link
              to="/"
              className="inline-block border-2 border-black px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
            >
              ← Go home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
