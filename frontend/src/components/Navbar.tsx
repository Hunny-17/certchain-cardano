import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-bg-dark/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cardano-blue to-cardano-teal flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CertChain</span>
        </Link>

        <div className="flex items-center gap-6">
          <a href="#how" className="text-sm text-white/70 hover:text-white transition hidden sm:inline">
            Cách hoạt động
          </a>
          <a href="#proof" className="text-sm text-white/70 hover:text-white transition hidden sm:inline">
            Chứng minh
          </a>
          <Link
            to="/verify"
            className="px-4 py-2 rounded-lg bg-white text-bg-dark text-sm font-semibold hover:bg-white/90 transition"
          >
            Xác minh bằng
          </Link>
        </div>
      </div>
    </nav>
  )
}