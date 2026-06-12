# CertChain — Video Tutorial Script (5 phút)

**Target:** YouTube unlisted · 1080p · Tiếng Việt + subtitles

---

## Setup trước khi record

- [ ] OBS Scene 1: Full screen (browser Chrome, clean)
- [ ] OBS Scene 2: Full screen + webcam góc dưới phải (240×135px)
- [ ] Microphone test: không có echo, không tiếng ồn nền
- [ ] Browser: xóa địa chỉ bar autocomplete gây spoil, zoom 100%
- [ ] Chuẩn bị sẵn: 1 tx hash hợp lệ, 1 file CSV 3 dòng, ảnh bằng cấp mẫu
- [ ] Tắt thông báo (Do Not Disturb)

---

## Script

### [0:00 – 0:20] Intro

*(Scene 2: webcam visible, màn hình landing page)*

> "Chào các bạn, tôi là Huy — developer của CertChain, nền tảng cấp bằng cấp học thuật trên blockchain Cardano.
>
> Trong 5 phút tới, tôi sẽ demo toàn bộ quy trình: từ cấp bằng cho sinh viên, đến cách sinh viên chia sẻ bằng, và cách nhà tuyển dụng xác minh trong 2 giây.
>
> Không cần blockchain knowledge. Chúng ta bắt đầu."

*(Nhấp vào ISSUER trên nav)*

---

### [0:20 – 1:00] Demo: Đăng nhập Issuer Portal

*(Scene 1: full screen)*

> "Đầu tiên, đăng nhập với tài khoản issuer của trường. Tôi dùng tài khoản demo của Văn Hiến University."

*(Type email + password → Sign In)*

> "Hệ thống xác minh quyền truy cập — và đây là Issuer Portal."

*(Portal hiện ra)*

> "Giao diện này dành cho cán bộ phụ trách cấp bằng của trường. Tôi có thể cấp đơn lẻ, hoặc bulk nhiều sinh viên cùng lúc từ CSV."

---

### [1:00 – 2:30] Demo: Cấp bằng đơn lẻ

> "Thử cấp bằng cho một sinh viên. Điền thông tin:"

*(Điền form, đọc từng trường)*

> "Tên sinh viên: Trần Quốc Huy.  
> Email.  
> Bằng: Bachelor of Computer Science.  
> Ngày cấp hôm nay."

*(Kéo file PDF vào IpfsUpload)*

> "Optional — tôi upload thêm bản scan bằng gốc lên IPFS để HR có thể tải về sau."

*(Thấy "✓ Uploaded")*

> "Uploaded rồi. Giờ Submit."

*(Click PUBLISH)*

> "Hệ thống đang build transaction, ký bằng custody wallet, và submit lên Cardano Preprod..."

*(Đợi ~30s, hiện progress steps)*

> "Mỗi bằng cấp mất khoảng 30–60 giây để confirm trên blockchain. Trong production thật, đây là trade-off của Cardano — bù lại, data immutable vĩnh viễn."

*(Thành công)*

> "Thành công! Tôi nhận được tx hash và quan trọng nhất — Claim Code 8 ký tự này. Cần lưu ngay và gửi riêng cho sinh viên. Nó chỉ hiện một lần."

---

### [2:30 – 3:15] Demo: Holder — sinh viên nhận bằng

*(Click HOLDER trên nav)*

> "Chuyển sang góc nhìn sinh viên. Holder page cho phép tra cứu bằng cấp bằng email hoặc tx hash."

*(Dán tx hash vào → tìm kiếm)*

> "QR code được tạo ngay lập tức từ tx hash. Sinh viên có thể lưu QR này vào điện thoại và chia sẻ với nhà tuyển dụng khi cần."

*(Tap vào QR để phóng to)*

> "Tap vào QR để phóng to — dễ quét hơn trong điều kiện ánh sáng thấp."

---

### [3:15 – 4:30] Demo: Verifier — nhà tuyển dụng xác minh

*(Click VERIFIER trên nav)*

> "Cuối cùng — góc nhìn của HR hoặc nhà tuyển dụng. Không cần đăng ký, không cần tài khoản."

*(Dán tx hash vào ô verify)*

> "Paste tx hash nhận từ ứng viên..."

*(Click VERIFY)*

> "Hai giây."

*(Kết quả hiện: "Authentic credential.")*

> "Verification Passed. Tên sinh viên, tên bằng, ngày cấp, trường cấp — tất cả lấy trực tiếp từ blockchain. Không thể fake vì data đã immutable."

*(Scroll xuống section [02] On-Chain NFT)*

> "Phần này show NFT details — policy ID, asset name — có thể verify độc lập trên Cardanoscan mà không cần tin vào CertChain."

*(Click Download Receipt PDF)*

> "HR có thể download Receipt PDF để lưu vào hồ sơ candidate cho audit sau này."

*(Click → Download thành công)*

> "PDF được generate ngay trên trình duyệt — không cần server."

---

### [4:30 – 5:00] Closing

*(Scene 2: webcam visible)*

> "Đó là toàn bộ flow của CertChain: cấp → chia sẻ → xác minh — dưới 2 phút cho toàn quy trình.
>
> CertChain hoàn toàn miễn phí cho Verifier. Các trường đại học muốn thử nghiệm có thể liên hệ qua link trong description.
>
> Source code mở trên GitHub — nếu bạn muốn contribute hoặc fork cho use case khác, welcome.
>
> Cảm ơn các bạn đã xem. Subscribe nếu bạn quan tâm đến blockchain education tech tại Việt Nam."

*(End screen: CertChain logo + links)*

---

## Post-production checklist

- [ ] Cut filler words ("ờ", "ừm", pause dài hơn 2s)
- [ ] Thêm chapter markers theo timestamps trên
- [ ] Upload YouTube unlisted
- [ ] Auto-generate subtitles → review + fix Vietnamese
- [ ] Add `.srt` file vào `docs/`
- [ ] Export thumbnail: màn hình verify success + text overlay "2 giây"
- [ ] Thêm YouTube link vào Admin Guide + README

---

## Thông tin video

```
Title: CertChain — Cấp và xác minh bằng cấp trên Cardano Blockchain (Demo V2.5)
Description:
Demo đầy đủ CertChain V2.5:
00:00 Intro
00:20 Đăng nhập Issuer Portal
01:00 Cấp bằng đơn lẻ
02:30 Holder view (sinh viên nhận QR)
03:15 Verifier (nhà tuyển dụng xác minh trong 2s)
04:30 Closing

🔗 Live demo: certchain-cardano.vercel.app
📂 Source: github.com/Hunny-17/certchain-cardano
📧 Liên hệ pilot: quochuy9.1hth2019@gmail.com

Tags: blockchain, cardano, diploma, vietnam, edtech, web3, NFT
```
