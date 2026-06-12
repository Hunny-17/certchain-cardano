# CertChain — Hướng dẫn Xác minh Bằng cấp

> **Dành cho:** Nhà tuyển dụng · HR · Compliance team · Bất kỳ ai cần xác minh bằng cấp

---

## Cách xác minh — 3 bước, dưới 30 giây

### Bước 1: Lấy thông tin từ ứng viên

Yêu cầu ứng viên cung cấp **một trong ba**:

- **Mã giao dịch (Tx Hash)** — chuỗi 64 ký tự, ví dụ:
  `3586fb6467ac3445695eed804654a6104b09a2f93e2b864dd8ef13cc634a38de`
- **Link xác minh trực tiếp** — `certchain-cardano.vercel.app/verify/<tx_hash>`
- **Mã QR** — Quét bằng camera điện thoại

---

### Bước 2: Truy cập trang xác minh

**[certchain-cardano.vercel.app/verify](https://certchain-cardano.vercel.app/verify)**

Không cần đăng ký · Không cần tài khoản · Hoàn toàn miễn phí

---

### Bước 3: Dán tx hash → Click Verify

Kết quả hiện trong **2 giây**.

---

## Kết quả hợp lệ

Bằng cấp xác thực khi hiển thị **đầy đủ cả 3 dấu hiệu**:

```
✓ VERIFICATION PASSED
Authentic credential.

Issued to · Trần Quốc Huy
```

Kèm theo:
- ✅ Tên người nhận khớp với ứng viên
- ✅ Tên bằng cấp + ngày cấp
- ✅ Tên trường cấp bằng
- ✅ Asset NFT on-chain (policy ID, asset name)
- ✅ Thời điểm lên blockchain

**Download Receipt PDF** → Lưu bằng chứng xác minh cho hồ sơ audit.

---

## Kết quả không hợp lệ

| Thông báo | Ý nghĩa |
|---|---|
| `Transaction not found` | Tx hash sai hoặc từ mạng khác |
| `No CertChain metadata` | Tx tồn tại nhưng không phải bằng CertChain |
| `Cannot verify this hash` | Lỗi kết nối — thử lại sau |

**Nếu nghi ngờ:** Yêu cầu ứng viên cung cấp tx hash khác, hoặc liên hệ trường cấp bằng để xác nhận.

---

## Câu hỏi thường gặp

**Có cần đăng ký không?**  
Không. Verification miễn phí và công khai — không cần tài khoản.

**Có thể làm giả kết quả không?**  
Không. Dữ liệu trên Cardano blockchain là immutable (không thể sửa hay xóa). Bạn có thể double-check độc lập tại [preprod.cardanoscan.io](https://preprod.cardanoscan.io).

**Nếu kết quả "Not Found"?**  
Yêu cầu ứng viên kiểm tra lại tx hash (copy đầy đủ 64 ký tự, không thiếu ký tự nào).

**Muốn lưu bằng chứng xác minh?**  
Click **↓ Download Receipt PDF** ngay sau khi verify — PDF chứa đầy đủ thông tin để lưu hồ sơ.

**Cần API tích hợp vào hệ thống HR?**  
Đang phát triển trong V3. Liên hệ qua [GitHub Issues](https://github.com/Hunny-17/certchain-cardano/issues).

**Bằng cấp này có giá trị pháp lý không?**  
CertChain cung cấp bằng chứng kỹ thuật số về tính xác thực. Giá trị pháp lý phụ thuộc vào quy định của từng tổ chức và quốc gia.

---

## Xác minh độc lập

Ngoài CertChain, bạn có thể verify trực tiếp trên blockchain:

1. Truy cập **[preprod.cardanoscan.io](https://preprod.cardanoscan.io)**
2. Dán tx hash vào ô tìm kiếm
3. Xem metadata tab — CertChain data hiện trong label `721` (CIP-25)

Không cần tin tưởng CertChain — dữ liệu trên blockchain là nguồn sự thật duy nhất.

---

*CertChain — [certchain-cardano.vercel.app](https://certchain-cardano.vercel.app)*  
*Hỗ trợ: [github.com/Hunny-17/certchain-cardano](https://github.com/Hunny-17/certchain-cardano)*
