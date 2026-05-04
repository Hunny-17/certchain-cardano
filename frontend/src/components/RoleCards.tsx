import { Building2, GraduationCap, Briefcase } from 'lucide-react'

const roles = [
  {
    icon: Building2,
    title: 'Issuer',
    subtitle: 'Trường đại học',
    description: 'Phát hành bằng on-chain với chữ ký số của trường. Bulk upload + OCR bằng cũ qua Qwen-VL.',
    color: 'from-cardano-blue to-blue-500',
  },
  {
    icon: GraduationCap,
    title: 'Holder',
    subtitle: 'Sinh viên',
    description: 'Sở hữu bằng dưới dạng QR code trong app. Chia sẻ với nhà tuyển dụng qua link hoặc quét.',
    color: 'from-cardano-teal to-emerald-500',
  },
  {
    icon: Briefcase,
    title: 'Verifier',
    subtitle: 'Nhà tuyển dụng',
    description: 'Quét QR → xác minh tính xác thực trong 2 giây. Không cần đăng nhập, không cần công văn.',
    color: 'from-purple-500 to-pink-500',
  },
]

export default function RoleCards() {
  return (
    <section id="how" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            3 vai trò, 1 hệ thống
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Trường ký, sinh viên giữ, nhà tuyển dụng xác minh — tất cả trên một blockchain.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.title}
              className="group relative p-8 rounded-2xl bg-bg-card border border-white/5 hover:border-white/15 transition overflow-hidden"
            >
              {/* Hover glow */}
              <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-20 blur-3xl transition duration-500`} />

              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6`}>
                <role.icon className="w-6 h-6 text-white" />
              </div>

              <div className="relative text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {role.subtitle}
              </div>
              <h3 className="relative text-2xl font-bold mb-3">{role.title}</h3>
              <p className="relative text-white/60 leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}