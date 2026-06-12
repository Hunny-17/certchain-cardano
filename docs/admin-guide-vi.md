# CertChain — Hướng dẫn Quản trị viên

**Phiên bản:** V2.5 · Cardano Preprod Testnet  
**Cập nhật:** 12/06/2026  
**Dành cho:** Quản trị viên phụ trách cấp bằng của trường đại học

---

## Mục lục

1. [Giới thiệu CertChain](#1-giới-thiệu-certchain)
2. [Đăng ký tài khoản trường](#2-đăng-ký-tài-khoản-trường)
3. [Đăng nhập và cấu hình tài khoản](#3-đăng-nhập-và-cấu-hình-tài-khoản)
4. [Cấp bằng đơn lẻ](#4-cấp-bằng-đơn-lẻ)
5. [Cấp bằng hàng loạt (CSV)](#5-cấp-bằng-hàng-loạt-csv)
6. [Upload tài liệu gốc (IPFS)](#6-upload-tài-liệu-gốc-ipfs)
7. [Quản lý lỗi và retry](#7-quản-lý-lỗi-và-retry)
8. [Thu hồi bằng cấp (Revocation)](#8-thu-hồi-bằng-cấp-revocation)
9. [Audit log và báo cáo](#9-audit-log-và-báo-cáo)
10. [FAQ và Troubleshooting](#10-faq-và-troubleshooting)
11. [Liên hệ và hỗ trợ](#11-liên-hệ-và-hỗ-trợ)

---

## 1. Giới thiệu CertChain

**CertChain** là nền tảng cấp và xác minh bằng cấp học thuật trên blockchain Cardano. Mỗi bằng cấp được mã hóa thành một NFT (Non-Fungible Token) theo chuẩn CIP-25, lưu trữ vĩnh viễn và không thể giả mạo trên blockchain.

### Tại sao blockchain?

| Hệ thống truyền thống | CertChain |
|---|---|
| 3–7 ngày xác minh qua công văn | 2 giây xác minh bằng tx hash |
| Dễ làm giả văn bằng | Không thể giả mạo — dữ liệu immutable |
| Không có cơ sở dữ liệu thống nhất | Một nguồn sự thật trên Cardano blockchain |
| Mất phí công chứng 500K–2M VND | Xác minh miễn phí, không cần tài khoản |

### Ba vai trò trong hệ thống

- **Issuer (Người cấp):** Quản trị viên trường — cấp bằng, upload tài liệu
- **Holder (Người nhận):** Sinh viên — nhận bằng, chia sẻ QR code
- **Verifier (Người xác minh):** Nhà tuyển dụng, HR — xác minh bằng cấp

> **Lưu ý:** V2.5 hiện chạy trên **Cardano Preprod Testnet** — bằng cấp chỉ có giá trị demo, chưa dùng cho mainnet thật.

---

## 2. Đăng ký tài khoản trường

### Quy trình hiện tại (V2.5 — Manual Bootstrap)

Vì V2.5 chưa có trang đăng ký tự động, việc tạo tài khoản trường cần thực hiện thủ công:

**Bước 1: Liên hệ với CertChain Admin**

Gửi email tới `quochuy9.1hth2019@gmail.com` hoặc tạo issue tại [GitHub](https://github.com/Hunny-17/certchain-cardano) với thông tin:

```
Tên trường: Đại học Văn Hiến
Domain email: @vhu.edu.vn
Người đại diện: [Họ tên]
Email đăng nhập: [email]
```

**Bước 2: Admin xác minh và tạo tài khoản**

Admin sẽ tạo tài khoản trong database Supabase và gửi lại:
- Email đăng nhập
- Link đặt mật khẩu lần đầu

**Bước 3: Đặt mật khẩu**

Nhấp vào link trong email → Đặt mật khẩu → Bắt đầu sử dụng.

> **V3 roadmap:** Trang đăng ký tự động với xác minh email `.edu.vn` sẽ ra mắt sau.

---

## 3. Đăng nhập và cấu hình tài khoản

### Đăng nhập

1. Truy cập **[certchain-cardano.vercel.app](https://certchain-cardano.vercel.app)**
2. Click **ISSUER** trên thanh điều hướng
3. Hệ thống redirect về trang `/login`
4. Nhập email và mật khẩu → Click **Sign In**

> 📸 **[CHỤP MÀN HÌNH]:** Trang login với form email/password

### Trạng thái tài khoản

Sau khi đăng nhập, hệ thống kiểm tra:

| Trạng thái | Màn hình hiển thị | Hành động |
|---|---|---|
| ✅ Đã xác minh | Issuer Portal | Bắt đầu cấp bằng |
| ⏳ Chờ xác minh | Trang "Pending Verification" | Liên hệ Admin |
| ❌ Chưa có quyền | Trang "Unauthorized" | Liên hệ Admin |

### Thông tin tài khoản

- **Institution:** Tên trường tự động lấy từ cấu hình tài khoản — không thể sửa trong form
- **Role:** `issuer` — có quyền mint bằng cấp

---

## 4. Cấp bằng đơn lẻ

### Truy cập

Sau khi đăng nhập → Chọn **[01] / Single Issue** (tab mặc định của Issuer Portal).

> 📸 **[CHỤP MÀN HÌNH]:** Issuer Portal với form cấp bằng đơn lẻ

### Điền thông tin

| Trường | Bắt buộc | Mô tả | Ví dụ |
|---|---|---|---|
| Recipient Name | ✅ | Họ tên đầy đủ của sinh viên | Trần Quốc Huy |
| Recipient Email | ✅ | Email nhận thông báo | huy@vhu.edu.vn |
| Student ID | ❌ | Mã số sinh viên | VHU2024001 |
| Date of Birth | ❌ | Ngày sinh (YYYY-MM-DD) | 2003-04-15 |
| Credential Title | ✅ | Tên bằng cấp | Bachelor of Computer Science |
| Institution | — | Tự động từ tài khoản | Văn Hiến University |
| Issue Date | ✅ | Ngày cấp (YYYY-MM-DD) | 2026-06-12 |
| Credential Type | ✅ | Loại bằng | Diploma / Certificate / Award |
| Notes | ❌ | Ghi chú thêm (tối đa 1000 ký tự) | Tốt nghiệp loại Giỏi |

> 📸 **[CHỤP MÀN HÌNH]:** Form đã điền đầy đủ thông tin sinh viên

### Upload tài liệu gốc (tuỳ chọn)

Xem [Mục 6](#6-upload-tài-liệu-gốc-ipfs) để upload PDF/ảnh bằng gốc trước khi Submit.

### Submit và chờ kết quả

1. Click **▶ PUBLISH TO BLOCKCHAIN**
2. Hệ thống hiển thị 3 bước xử lý:
   - Building mint transaction (Mesh.js + CIP-25 metadata)
   - Signing with custody wallet (Ed25519)
   - Submitting to Cardano Preprod (~30 giây)
3. Sau **30–60 giây**, màn hình thành công hiển thị

> 📸 **[CHỤP MÀN HÌNH]:** Màn hình processing với 3 bước đang chạy

### Thông tin sau khi cấp thành công

> 📸 **[CHỤP MÀN HÌNH]:** Màn hình success với tx hash, claim code, QR

Bạn sẽ nhận được:

| Thông tin | Mô tả | Cần làm |
|---|---|---|
| **Tx Hash** | 64 ký tự hex — định danh on-chain | Lưu lại, chia sẻ với sinh viên |
| **Claim Code** | 8 ký tự — dùng để claim bằng | **⚠️ Lưu ngay!** Chỉ hiện 1 lần |
| **Cardanoscan URL** | Link xem tx trên blockchain | Có thể chia sẻ công khai |

> **⚠️ QUAN TRỌNG: Claim Code chỉ hiện 1 lần.** Sau khi rời trang, không thể khôi phục. Hãy lưu vào spreadsheet và gửi riêng cho sinh viên qua email.

### Chia sẻ với sinh viên

Sau khi cấp bằng, gửi cho sinh viên:
- **Tx Hash** (để verify)
- **Claim Code** (để nhận NFT về ví cá nhân — V3)
- Link: `certchain-cardano.vercel.app/verify/<tx_hash>`

---

## 5. Cấp bằng hàng loạt (CSV)

### Khi nào dùng

- Cấp bằng cho toàn bộ sinh viên tốt nghiệp một đợt
- Số lượng từ 2 sinh viên trở lên

> ⚠️ **Thời gian ước tính:** ~65 giây/sinh viên. 10 sinh viên ≈ 11 phút. Không đóng tab trong khi đang xử lý.

### Truy cập

Issuer Portal → Tab **[04] / Bulk Issuance**

> 📸 **[CHỤP MÀN HÌNH]:** Tab Bulk Issuance với dropzone

### Định dạng CSV

Tạo file `.csv` với các cột sau:

```csv
recipientName,recipientEmail,recipientStudentId,recipientDob,credentialTitle,credentialType,institution,issue_date
Trần Quốc Huy,huy@vhu.edu.vn,VHU2024001,2003-04-15,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
Nguyễn Thanh Tùng,tung@vhu.edu.vn,VHU2024002,2003-07-22,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
```

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `recipientName` | ✅ | Họ tên đầy đủ |
| `recipientEmail` | ❌ | Nếu trống → dùng email tự tạo |
| `recipientStudentId` | ❌ | Mã số sinh viên |
| `recipientDob` | ❌ | Ngày sinh YYYY-MM-DD |
| `credentialTitle` | ✅ | Tên bằng cấp |
| `credentialType` | ❌ | Mặc định: Diploma |
| `institution` | ✅ | Tên trường |
| `issue_date` | ❌ | Mặc định: ngày hôm nay |

> 📸 **[CHỤP MÀN HÌNH]:** File CSV mẫu mở trong Excel

### Quy trình

**Bước 1: Upload CSV**

- Kéo thả file vào dropzone, hoặc click **Browse file**
- Hoặc click **Use sample template** để dùng CSV mẫu 10 sinh viên

> 📸 **[CHỤP MÀN HÌNH]:** Dropzone với file đang được kéo vào

**Bước 2: Xem Preview**

Hệ thống phân tích CSV và hiển thị bảng preview:
- ✓ Ready — hàng hợp lệ
- ✕ Missing field — thiếu trường bắt buộc

> 📸 **[CHỤP MÀN HÌNH]:** Preview table với status Ready/Error mỗi hàng

Kiểm tra kỹ trước khi tiếp tục. Hàng lỗi sẽ không được xử lý.

**Bước 3: Xác nhận và xử lý**

Click **Process all N →** để bắt đầu. Hệ thống xử lý tuần tự từng hàng:

> 📸 **[CHỤP MÀN HÌNH]:** Processing view với live log và progress bar

- ◉ SUBMITTING — đang gửi lên blockchain
- ✓ — thành công, hiện tx hash đầu
- ✕ — lỗi, hiện thông báo lỗi ngắn
- ⏸ — đang chờ lượt

**Abort giữa chừng:** Click **✕ Abort batch** — hệ thống sẽ dừng sau khi row hiện tại hoàn thành (không hủy tx đang chạy).

**Bước 4: Xem kết quả**

> 📸 **[CHỤP MÀN HÌNH]:** Complete view với X minted, Y failed

- **X minted** — thành công, có thể mở **View transaction hashes**
- **Y failed** — thất bại, có thể **Retry Y failed rows**

### Retry hàng lỗi

Nếu có hàng thất bại, click **↻ Retry N failed rows** — hệ thống tự động chạy lại chỉ các hàng đó, bỏ qua hàng đã thành công.

> 📸 **[CHỤP MÀN HÌNH]:** Error details section với tên sinh viên và thông báo lỗi

---

## 6. Upload tài liệu gốc (IPFS)

### Mục đích

Đính kèm bản scan PDF hoặc ảnh của bằng cấp gốc vào NFT, lưu vĩnh viễn trên IPFS. HR có thể tải về bằng nút **↓ Download original** trên trang Verifier.

### Khi nào upload

**Trước khi Submit** trong form cấp đơn lẻ ([Mục 4](#4-cấp-bằng-đơn-lẻ)).

### Định dạng hỗ trợ

| Định dạng | Kích thước tối đa |
|---|---|
| PDF | 10 MB |
| PNG | 10 MB |
| JPG/JPEG | 10 MB |

### Quy trình

1. Trong form cấp bằng, tìm phần **Original Document (IPFS)**
2. Kéo thả file vào dropzone hoặc click để chọn
3. Chờ upload (~5–10 giây)
4. Hiện thị **✓ Uploaded — CID: Qm...**
5. Tiếp tục điền form và Submit bình thường

> 📸 **[CHỤP MÀN HÌNH]:** IpfsUpload component với file đã upload thành công

> **Lưu ý:** Nếu không upload file, bằng cấp vẫn được cấp bình thường — chỉ không có tài liệu đính kèm.

---

## 7. Quản lý lỗi và retry

### Các lỗi phổ biến

| Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `Mint timed out after 90s` | Mạng chậm hoặc Cardano congestion | Kiểm tra Cardanoscan, thử lại sau 5 phút |
| `Invalid request body` | Form thiếu trường hoặc định dạng sai | Kiểm tra lại tất cả trường |
| `Unauthorized` | Session hết hạn | Đăng xuất và đăng nhập lại |
| `institution cannot be blank` | Tài khoản chưa được gán university | Liên hệ Admin |
| `issue_date must be YYYY-MM-DD` | Định dạng ngày sai trong CSV | Sửa CSV — dùng `2026-06-12` không phải `12/06/2026` |

### Kiểm tra tx đã lên chain chưa

Trước khi retry, kiểm tra xem tx đã submit chưa:

1. Lấy tx hash từ màn hình lỗi (nếu có)
2. Truy cập [preprod.cardanoscan.io/transaction/\<tx_hash\>](https://preprod.cardanoscan.io)
3. Nếu tx hiện lên → **đừng retry** (tránh double-mint)
4. Nếu tx 404 → an toàn để retry

> **⚠️ Cảnh báo double-mint:** Nếu mint đã thành công nhưng UI báo lỗi (do timeout), retry sẽ tạo thêm 1 NFT mới cho cùng sinh viên. Luôn check Cardanoscan trước khi retry.

---

## 8. Thu hồi bằng cấp (Revocation)

> **⚠️ V2.5 chưa hỗ trợ revocation tự động.**

Blockchain data là immutable — không thể xóa record đã lên chain. Tuy nhiên có thể xử lý thủ công:

1. **Ghi nhận trong Supabase:** Cập nhật cột `status = 'revoked'` trong bảng `certificates` (cần quyền admin Supabase)
2. **Thông báo công khai:** Publish thông báo thu hồi qua kênh chính thức của trường
3. **Liên hệ CertChain:** Admin có thể thêm flag vào Verifier page để hiện cảnh báo

> **V3 roadmap:** Revocation registry on-chain với CIP-88 sẽ được tích hợp.

---

## 9. Audit log và báo cáo

### Truy cập Audit Log

Hiện tại, audit log được xem qua Supabase Dashboard (chưa có UI riêng):

1. Truy cập [supabase.com](https://supabase.com) → Đăng nhập
2. Chọn project CertChain → **Table Editor** → **audit_log**
3. Lọc theo `university_id` của trường bạn

> 📸 **[CHỤP MÀN HÌNH]:** Supabase Table Editor với bảng audit_log

### Các event được ghi lại

| Event | Mô tả |
|---|---|
| `mint_success` | Cấp bằng thành công — có tx_hash, asset_id |
| `mint_failure` | Cấp bằng thất bại — có error_message |
| `mint_db_error` | Tx đã lên chain nhưng lỗi lưu database |
| `validation_error` | Form không hợp lệ |
| `auth_error` | Xác thực thất bại |

### Báo cáo tổng hợp

Query SQL trong Supabase SQL Editor:

```sql
-- Tổng số bằng đã cấp theo tháng
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_minted,
  SUM(CASE WHEN event_type = 'mint_failure' THEN 1 ELSE 0 END) AS failed
FROM audit_log
WHERE university_id = '<your_university_id>'
  AND event_type IN ('mint_success', 'mint_failure')
GROUP BY 1
ORDER BY 1 DESC;
```

> **V3 roadmap:** Dashboard báo cáo trực quan với biểu đồ sẽ được thêm vào Issuer Portal.

---

## 10. FAQ và Troubleshooting

**Q: Tôi cấp bằng nhưng sinh viên chưa nhận được gì?**

A: V2.5 gửi NFT vào custody wallet của CertChain, chưa transfer trực tiếp về ví sinh viên. Hãy gửi cho sinh viên tx hash và claim code để họ có thể verify và (V3) claim về ví cá nhân.

---

**Q: Tôi không thấy nút "Bulk Issuance"?**

A: Bulk Issuance nằm ở tab thứ 4 trong Issuer Portal. Nếu không thấy, có thể session đã hết hạn — thử đăng xuất và đăng nhập lại.

---

**Q: CSV upload xong nhưng tất cả hàng đều báo lỗi "Missing institution"?**

A: CSV của bạn thiếu cột `institution`. Thêm cột này với tên trường đầy đủ.

---

**Q: Tx hash tôi nhận được không tìm thấy trên Cardanoscan?**

A: Cardano block confirmation mất ~20 giây. Đợi 1–2 phút rồi refresh lại Cardanoscan.

---

**Q: Tôi muốn cấp bằng trên Mainnet (thật)?**

A: V2.5 đang chạy Preprod Testnet. Mainnet deployment sẽ được thực hiện sau khi hoàn thiện security audit. Liên hệ Admin để được thông báo khi sẵn sàng.

---

**Q: Có thể sửa thông tin bằng sau khi đã cấp không?**

A: Không. Blockchain data là immutable. Nếu cần sửa, phải thu hồi (xem [Mục 8](#8-thu-hồi-bằng-cấp-revocation)) và cấp lại bằng mới.

---

**Q: Upload IPFS có bắt buộc không?**

A: Không. IPFS upload là tuỳ chọn. Bằng cấp vẫn hợp lệ trên blockchain dù không có tài liệu đính kèm.

---

## 11. Liên hệ và hỗ trợ

| Kênh | Địa chỉ |
|---|---|
| GitHub Issues | [github.com/Hunny-17/certchain-cardano/issues](https://github.com/Hunny-17/certchain-cardano/issues) |
| Email | quochuy9.1hth2019@gmail.com |
| Live site | [certchain-cardano.vercel.app](https://certchain-cardano.vercel.app) |

Khi báo lỗi, hãy kèm:
- Tx hash (nếu có)
- Thông báo lỗi chính xác
- Trình duyệt và hệ điều hành

---

*CertChain — Built with ❤️ for Vietnam's diploma verification crisis.*  
*Cardano SEA Hackathon 2026 — Top 3 EdTech Track*
