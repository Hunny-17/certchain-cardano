import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cardano-blue/20 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-cardano-teal/15 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
          <ShieldCheck className="w-4 h-4 text-cardano-teal" />
          <span className="text-xs font-medium text-white/80">Live trên Cardano Preprod • M1 POC đã verify</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          Bằng cấp{' '}
          <span className="bg-gradient-to-r from-cardano-blue via-cardano-teal to-cardano-blue bg-clip-text text-transparent">không thể giả mạo</span>
          <br />
          xác minh trong 2 giây.
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          CertChain phát hành bằng cấp giáo dục dưới dạng metadata bất biến trên blockchain Cardano. Nhà tuyển dụng quét QR — không cần công văn, không cần lãnh sự.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/verify" className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-bg-dark font-semibold hover:bg-white/90 transition">
            Thử xác minh ngay
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </Link>
          <a href="#proof" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/15 text-white/90 hover:bg-white/5 transition">
            Xem chứng minh on-chain
          </a>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
          {[
            { value: '2s', label: 'Thời gian xác minh' },
            { value: '1.500đ', label: 'Chi phí mỗi bằng' },
            { value: '∞', label: 'Lưu trữ trên blockchain' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-white/50 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}