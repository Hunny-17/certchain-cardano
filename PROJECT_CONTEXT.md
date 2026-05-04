# CertChain — Master Project Context

> **CÁCH DÙNG FILE NÀY**: Upload file này vào đầu mỗi chat mới với Claude (hoặc AI khác) để giữ nguyên toàn bộ context dự án mà không cần giải thích lại từ đầu. Tiết kiệm token + đảm bảo nhất quán.

---

## 1. Người dùng

- **Tên**: Huy (GitHub: Hunny-17)
- **Trường**: ĐH Văn Hiến, ngành CS, dự kiến tốt nghiệp 2027
- **Vị trí**: TP.HCM, Việt Nam
- **Ngôn ngữ giao tiếp ưu tiên**: Tiếng Việt
- **Tech background**: React, FastAPI, C++, Docker, Qwen API (Dashscope). Có kinh nghiệm hackathon (Lotus, Habit Coach, Healix, PhysicsLab).

## 2. Cuộc thi

- **Tên**: Cardano SEA Hackathon 2026 — Shaping the Next Southeast Asia Builders
- **Tổ chức**: Hub Network + Cardano Vietnam + ĐH Nguyễn Tất Thành (NTU-VN)
- **Đối tượng**: HS/SV ĐH-CĐ tại VN & SEA, dev/startup giai đoạn đầu
- **Yêu cầu sản phẩm**: AI và/hoặc Blockchain (ưu tiên Cardano), giải bài toán thực tiễn
- **Hình thức team**: Solo hoặc tối đa 4 người

### Timeline
| Giai đoạn | Thời gian | Yêu cầu |
|---|---|---|
| Mở đơn | 09/04 – 08/05/2026 | Đăng ký + nộp ý tưởng (V1) |
| **V1 Đề xuất ý tưởng** | **Deadline 23h59 ngày 08/05/2026** | Idea proposal |
| V2 Đề án chi tiết | 12 – 17/05/2026 | Detailed proposal |
| Chung kết 24h | 26 – 27/05/2026 | 24h Hackathon + Pitching |

### Link đăng ký
https://form.jotform.com/260982100191046

## 3. Dự án: CertChain

### One-liner
Bằng cấp/chứng chỉ giáo dục on-chain Cardano — chống bằng giả, xác minh trong 2 giây qua QR code.

### Pain point chính
- VN có ~600,000 SV tốt nghiệp/năm, hàng nghìn vụ bằng giả mỗi năm
- Doanh nghiệp mất 5-15 ngày verify bằng qua công văn
- Du học/làm việc nước ngoài tốn 500k-2tr/bằng + 2-4 tuần hợp pháp hóa lãnh sự

### Pitch hook (cho BTC)
**"NTU có thể là đại học đầu tiên ở SEA phát hành bằng on-chain"** — vì NTU đồng tổ chức cuộc thi.

### Tech Stack (đã chốt)
| Layer | Tech | Lý do |
|---|---|---|
| Frontend Issuer | React 19 + Vite + Tailwind | Huy đã thành thạo |
| Frontend Verifier | React PWA + react-qr-reader | Offline-capable |
| Backend | FastAPI + SQLAlchemy + PostgreSQL | Huy đã thành thạo |
| AI/OCR | Qwen-VL via Dashscope | Huy đã có API key |
| Blockchain SDK | **Mesh.js** (TypeScript) | Đơn giản hơn Lucid, doc tốt |
| Cardano network | **Preprod testnet** | Free, ổn định cho hackathon |
| On-chain data | **CIP-20 transaction metadata** | Không cần smart contract Aiken |
| Wallet | Lace (CIP-30 standard) | Light, dễ dùng |
| Deploy | Vercel (FE) + Railway (BE) | Free tier đủ demo |

### Cấu trúc metadata on-chain (CIP-20)
```json
{
  "674": {
    "msg": ["CertChain Diploma Issuance v1"],
    "issuer": { "id": "NTU-VN", "name": "...", "pubkey_hash": "..." },
    "credential": {
      "type": "Bachelor of Computer Science",
      "student_id_hash": "sha256(MSSV+salt)",
      "name_hash": "sha256(fullname+salt)",
      "major": "Computer Science",
      "gpa": "3.5",
      "graduation_date": "2027-06-15",
      "doc_hash": "sha256(originaldoc)"
    },
    "signature": "ed25519_signature"
  }
}
```
**Privacy**: Hash thông tin cá nhân, không lưu plaintext on-chain. Verifier cần consent của holder để nhận salt.

### 3 vai trò
- **Issuer** (Trường): Phát hành bằng on-chain
- **Holder** (Sinh viên): Sở hữu QR đại diện bằng
- **Verifier** (Nhà tuyển dụng): Quét QR → verify trong 2 giây

### AI components
1. **Bulk Digitization**: Qwen-VL OCR bằng cũ → extract tên/MSSV/ngành/GPA/ngày cấp
2. **Anti-Fraud Detection**: So sánh ảnh bằng với template trường, detect anomaly font/layout
3. **Multi-language**: LLM translate metadata sang EN cho verifier nước ngoài

## 4. Roadmap 6 Milestones

| ID | Thời gian | Mục tiêu | Stage Gate (PASS = đi tiếp) |
|---|---|---|---|
| **M1** | 04-05/05 | Setup + Hello Cardano POC | Có txHash Preprod submit thành công |
| **M2** | 06-08/05 | Vòng 1 đề xuất + đăng ký | Form submitted + email confirm |
| **M3** | 09-12/05 | Backend MVP | `POST /issue` trả về `{txHash}` valid |
| **M4** | 13-17/05 | Frontend MVP + đề án V2 | Quét QR thật → hiện bằng đã issue |
| **M5** | 18-25/05 | Polish + AI integration | Upload PDF bằng → Qwen-VL extract đúng |
| **M6** | 26-27/05 | 24h hackathon + pitch | Demo end-to-end 3 lần liên tiếp không lỗi |

## 5. Risk Register

| Risk | Khả năng | Backup plan |
|---|---|---|
| Cardano Preprod down 26-27/05 | Trung bình | Pre-cache 5 tx mẫu, demo từ cache |
| Mesh.js breaking change | Thấp | Pin version trong package.json từ M1 |
| Qwen-VL rate limit đêm chung kết | Trung bình | Pre-process 10 bằng mẫu sẵn |
| Bạn ốm/mệt 26-27/05 | Trung bình | M5 phải production-ready, 24h chỉ polish |
| Wifi venue chậm | Cao | Demo PWA offline-capable + local DB |
| Wallet không work máy demo | Cao | Laptop riêng setup sẵn + video demo dự phòng |

## 6. Business Model (cho V2 + Pitch)

**Revenue streams**:
- B2B SaaS trường: 5-20tr/tháng
- Pay-per-issue: 5,000đ/bằng
- Verifier API: Free cá nhân, có phí cho doanh nghiệp tuyển dụng cao tần
- International verification: 200-500k/bằng (rẻ hơn lãnh sự 70-80%)

**TAM cơ bản VN**: 240 trường × 25tr/năm = **6 tỷ/năm** (chưa tính verifier fees + SEA expansion)

## 7. Đối thủ cạnh tranh

| Đối thủ | Hạn chế | CertChain hơn ở đâu |
|---|---|---|
| Hệ thống Bộ GD&ĐT (vanbang.moet.gov.vn) | Chậm, không real-time, thiếu data | On-chain, bất biến, instant |
| Diploma Verify (US) | Không phục vụ VN/SEA | Local-first, tiếng Việt |
| Blockcerts (MIT) | Hạ tầng phức tạp | Plug-and-play SaaS |
| LinkedIn Verify | Self-reported, không có authority | Trường ký số trực tiếp |

## 8. Tại sao Cardano (không phải Ethereum/Solana)

- Phí thấp ổn định: ~0.17 ADA/tx (~1,500đ), không spike
- Native metadata support (CIP-20) — không cần smart contract → ít attack surface
- Catalyst funding cho dự án giáo dục
- Cardano Foundation đang đẩy mạnh thị trường VN/SEA

## 9. Trạng thái hiện tại

**Ngày**: 04/05/2026
**Milestone đang làm**: M1 — Setup + Hello Cardano POC
**Việc cần làm tiếp**:
- [ ] Submit form Jotform Vòng 1
- [ ] Cài Lace wallet, switch Preprod, xin tADA
- [ ] Chạy hello-cardano.ts thành công → có txHash
- [ ] Push repo lên GitHub
- [ ] Viết draft đề xuất V1 (deadline 08/05)

## 10. Ghi chú quan trọng

- **Solo project**: Tất cả phải tự làm → ưu tiên scope nhỏ + demo đẹp hơn là feature nhiều
- **Tận dụng kinh nghiệm Healix**: Stack giống nhau (React + FastAPI + Qwen) → giảm learning curve
- **NTU advantage**: Mọi bài viết/pitch nên reference NTU explicitly để được điểm tâm lý
- **Build first, stage gates**: Không pass milestone thì KHÔNG đi tiếp, tránh sa lầy
