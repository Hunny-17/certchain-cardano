# M1 Quick Start Guide

> **Mục tiêu**: Trong 4-6 tiếng, có 1 transaction Cardano confirm trên Preprod testnet với CertChain metadata.

---

## Bước 1: Lace Wallet (15 phút)

1. Vào https://www.lace.io/ → Download cho Chrome/Firefox
2. Cài extension → Open
3. **Create New Wallet** → đặt password
4. **CRITICAL**: Network → Settings → **Switch to "Preprod"** (KHÔNG dùng Mainnet!)
5. Recovery phrase → write down 24 từ vào nơi an toàn
6. Copy địa chỉ wallet (bắt đầu bằng `addr_test1...`)

⚠️ **Cảnh báo**: Đây là wallet TEST. KHÔNG bao giờ dùng wallet thật của bạn cho hackathon. Tạo wallet hoàn toàn mới.

---

## Bước 2: Xin tADA miễn phí (5 phút)

1. Vào https://docs.cardano.org/cardano-testnets/tools/faucet/
2. Chọn network: **Preprod**
3. Paste địa chỉ `addr_test1...` của bạn
4. Submit → đợi 30-60 giây
5. Mở Lace → confirm balance ~10,000 tADA (rất nhiều, đủ dùng cả tháng)

---

## Bước 3: Blockfrost API Key (10 phút)

1. Vào https://blockfrost.io/ → **Sign Up** (free)
2. Verify email → Login
3. Dashboard → **Add Project**
4. Project name: `certchain-poc`
5. Network: **Cardano preprod** (QUAN TRỌNG)
6. Click create → Copy **Project ID** (dạng `preprod...`)

---

## Bước 4: Setup Code Local (15 phút)

```bash
# Tạo thư mục và clone files
mkdir certchain && cd certchain

# Copy tất cả files mình gửi vào đây
# (PROJECT_CONTEXT.md, README.md, package.json, scripts/, .env.example, .gitignore)

# Cài dependencies
npm install

# Setup env
cp .env.example .env

# Mở .env bằng editor, paste vào:
#   WALLET_MNEMONIC="từ_1 từ_2 ... từ_24"
#   BLOCKFROST_PREPROD_KEY="preprod..."
```

---

## Bước 5: Chạy POC (5 phút)

```bash
npm run hello
```

**Expected output**:
```
🚀 CertChain Hello Cardano POC

✓ Blockfrost provider initialized
✓ Wallet address: addr_test1...
✓ Balance: 10000 tADA

📝 Building transaction...
✍️  Signing transaction...
📤 Submitting to Cardano Preprod...

✅ SUCCESS!
   TxHash: abc123def456...
   Explorer: https://preprod.cardanoscan.io/transaction/abc123def456...
```

---

## Bước 6: Verify trên Cardanoscan (5 phút)

1. Click link Explorer trong output
2. Scroll xuống → tab **Metadata**
3. Confirm thấy JSON CertChain metadata
4. **Screenshot** → save vào folder `docs/screenshots/`

---

## Bước 7: Verify lại bằng script (5 phút)

```bash
# Thay <txHash> bằng giá trị thật từ output bước 5
npm run verify -- <txHash>
```

Output sẽ in ra metadata fetch từ blockchain → confirm Verifier flow sẽ hoạt động.

---

## Bước 8: Push lên GitHub (15 phút)

```bash
# Init git
git init
git add .
git commit -m "M1: Hello Cardano POC - first metadata transaction on Preprod"

# Tạo repo trên GitHub.com tên "certchain-cardano" (public)
# Sau đó:
git remote add origin https://github.com/Hunny-17/certchain-cardano.git
git branch -M main
git push -u origin main
```

---

## ✅ Stage Gate Check

Sau khi xong tất cả các bước trên, bạn sẽ có:

- ✅ TxHash của 1 CertChain transaction trên Cardano Preprod
- ✅ Link Cardanoscan public ai cũng xem được
- ✅ Repo GitHub `certchain-cardano` public
- ✅ Hiểu được full flow: build → sign → submit → fetch metadata

→ **Đủ điều kiện qua M1**, sẵn sàng làm M2 (viết đề xuất V1).

---

## 🆘 Troubleshooting

### "Insufficient tADA" error
- Đợi 1-2 phút sau khi xin faucet → check lại balance
- Nếu vẫn không có → xin lại faucet, có thể bị rate limit

### "Invalid mnemonic" error
- Check seed phrase đúng 24 từ, mỗi từ cách nhau 1 space
- Không có space đầu/cuối, không có dấu phẩy

### "Bad request" từ Blockfrost
- Check API key đúng PREPROD project, không phải Mainnet
- Check key bắt đầu bằng `preprod`

### Transaction "submitted" nhưng không thấy trên Cardanoscan
- Đợi 30-90 giây — block time của Cardano là ~20s
- Refresh trang Cardanoscan
- Nếu sau 5 phút vẫn không thấy → tx có thể bị reject, check error logs

### Mesh.js import error
- Confirm `node` >= 18.0.0: `node --version`
- Xóa `node_modules` + `package-lock.json` → `npm install` lại

---

## Khi nào bạn xong M1, ping mình:

> "M1 done. TxHash: ..."

Mình sẽ giúp bạn move sang M2 (viết đề xuất V1).
