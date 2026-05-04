# CertChain Milestone Checklist

> Track progress qua từng giai đoạn. Đánh dấu `[x]` khi xong.
> **Quy tắc**: Không pass stage gate thì KHÔNG bước qua milestone tiếp theo.

---

## ✅ M1 — Setup + Hello Cardano POC (04-05/05/2026)

### Setup
- [ ] Submit form Vòng 1 trên Jotform: https://form.jotform.com/260982100191046
- [ ] Cài Lace wallet (https://www.lace.io/)
- [ ] Switch wallet sang **Preprod** network (Settings → Network)
- [ ] Lưu seed phrase 24 từ vào nơi an toàn
- [ ] Xin tADA từ faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/
- [ ] Confirm balance ≥ 5 tADA trong wallet
- [ ] Đăng ký Blockfrost.io free → tạo project Preprod → lấy API key

### Code POC
- [ ] `cd certchain && npm install`
- [ ] `cp .env.example .env` → điền seed phrase + Blockfrost key
- [ ] `npm run hello` → submit transaction thành công
- [ ] Lưu txHash output ra notepad
- [ ] Mở Cardanoscan link → confirm transaction visible với metadata
- [ ] `npm run verify -- <txHash>` → fetch lại metadata thành công

### GitHub
- [ ] Tạo repo public `certchain-cardano` trên GitHub
- [ ] Initial commit với code POC + README
- [ ] Add screenshot Cardanoscan vào README
- [ ] Push lên GitHub

### 🚪 Stage Gate M1
**Pass điều kiện**: Có 1 txHash Preprod confirmed + repo public trên GitHub
- [ ] **PASSED** ← chỉ tick khi cả 2 điều trên đều xong

---

## ✅ M2 — Vòng 1 Đề Xuất Ý Tưởng (06-08/05/2026)

- [ ] Viết draft đề xuất theo template (xem PROJECT_CONTEXT.md mục 3)
- [ ] Cấu trúc đề xuất: Vấn đề → Giải pháp → AI/Blockchain role → Khả thi → Tác động → Đối tượng
- [ ] Insert link GitHub repo + txHash POC làm "proof of execution"
- [ ] Cho 1-2 người đọc lại, refine
- [ ] **08/05 sáng**: Submit qua link BTC (KHÔNG đợi tối deadline)
- [ ] Save email confirmation từ BTC

### 🚪 Stage Gate M2
**Pass điều kiện**: Email xác nhận từ BTC + được vào Vòng 2
- [ ] **PASSED**

---

## ✅ M3 — Backend MVP (09-12/05/2026)

### Backend FastAPI
- [ ] Setup FastAPI project structure
- [ ] PostgreSQL setup (Docker Compose local)
- [ ] Models: `Issuer`, `Diploma`, `IssuanceRecord`
- [ ] Endpoint `POST /api/issue` — input diploma data, output txHash
- [ ] Endpoint `GET /api/diploma/:txHash` — fetch diploma từ on-chain
- [ ] Endpoint `POST /api/verify` — verify diploma authenticity
- [ ] Cardano integration: dùng Mesh.js (port từ `hello-cardano.ts`)
- [ ] Test với Postman/curl: issue 1 bằng → fetch lại → verify

### 🚪 Stage Gate M3
**Pass điều kiện**: `curl POST /api/issue` trả về txHash valid + `GET /api/diploma/:txHash` trả về đúng data
- [ ] **PASSED**

---

## ✅ M4 — Frontend MVP + Đề Án V2 (13-17/05/2026)

### Frontend Issuer Portal
- [ ] React 19 + Vite project setup
- [ ] Tailwind CSS configured
- [ ] Page: Login (mock auth)
- [ ] Page: Dashboard — list issued diplomas
- [ ] Page: Issue New Diploma — form + submit → call backend
- [ ] Hiển thị QR code sau khi issue thành công

### Frontend Verifier (PWA)
- [ ] React PWA setup (manifest + service worker)
- [ ] Page: QR Scanner (react-qr-reader)
- [ ] Page: Verification Result — hiển thị diploma info + ✅/❌ status
- [ ] Test trên mobile thật (không chỉ desktop)

### Đề án V2
- [ ] Mở rộng đề xuất V1 thành đề án 8-12 trang
- [ ] Include: Architecture diagram, Tech stack details, Roadmap, Business model, Competitive analysis
- [ ] Submit trong cửa sổ 12-17/05

### 🚪 Stage Gate M4
**Pass điều kiện**: Quét QR thật trên điện thoại → app verify thành công + đề án V2 submitted
- [ ] **PASSED**

---

## ✅ M5 — AI Integration & Polish (18-25/05/2026)

### Qwen-VL OCR
- [ ] Endpoint `POST /api/ocr/diploma` — upload PDF/image → extract fields
- [ ] Test với 5+ bằng mẫu (giả lập)
- [ ] UI: Bulk Upload page cho Issuer

### Anti-Fraud Detection
- [ ] So sánh ảnh upload với template chuẩn
- [ ] Trả về confidence score 0-100
- [ ] UI: Hiển thị warning nếu score < 70

### Polish
- [ ] UX improvements: loading states, error messages, animations
- [ ] Responsive design check (mobile + tablet + desktop)
- [ ] Performance: Lighthouse score > 80
- [ ] Documentation: API docs (Swagger/OpenAPI)

### Pre-deploy
- [ ] Deploy frontend lên Vercel
- [ ] Deploy backend lên Railway/Render
- [ ] Test end-to-end trên production URLs
- [ ] Pre-cache 5 transaction mẫu (backup cho hackathon)

### 🚪 Stage Gate M5
**Pass điều kiện**: Upload PDF bằng giả → Qwen-VL extract đúng tên + MSSV + ngành. Demo end-to-end production chạy được.
- [ ] **PASSED**

---

## ✅ M6 — 24h Hackathon + Pitch (26-27/05/2026)

### 24h Build (theo schedule chi tiết)
- [ ] H0-H4: Final integrations + bug fixes
- [ ] H4-H10: Polish UI, animations, transitions
- [ ] H10-H16: Prepare demo data, scripts, screenshots
- [ ] H16-H20: Slide deck (8-10 slides) + script pitch
- [ ] H20-H22: Quay video demo dự phòng (offline backup)
- [ ] H22-H24: Rehearse pitch 3-5 lần

### Pitch Deck
- [ ] Slide 1: Hook + One-liner
- [ ] Slide 2: Problem (con số cụ thể VN)
- [ ] Slide 3: Solution (3 vai trò: Issuer/Holder/Verifier)
- [ ] Slide 4: Demo (live hoặc video)
- [ ] Slide 5: Why Cardano (lợi thế cụ thể)
- [ ] Slide 6: Business model + TAM
- [ ] Slide 7: Roadmap (Năm 1-3-5)
- [ ] Slide 8: Team + Ask (mentorship + Catalyst Fund 16)

### Final
- [ ] Demo end-to-end chạy được 3 lần liên tiếp không lỗi
- [ ] Backup video sẵn (nếu live demo fail)
- [ ] Submit pitch deck + GitHub link cho BTC
- [ ] Pitch trên sân khấu

### 🚪 Stage Gate M6
**Pass điều kiện**: Pitch xong, sản phẩm đã submit
- [ ] **PASSED — Cuộc thi kết thúc!**

---

## 📝 Notes & Learnings

> Ghi chú lại các vấn đề gặp phải, cách giải quyết, để học hỏi cho các hackathon sau.

### M1 Learnings
- [ ] _Điền sau khi xong M1_

### M2 Learnings
- [ ] _Điền sau khi xong M2_

(Tiếp tục cho M3-M6...)
