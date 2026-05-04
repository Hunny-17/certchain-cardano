/**
 * CertChain — Hello Cardano POC (Milestone 1)
 *
 * Mục tiêu: Submit 1 transaction với metadata test lên Cardano Preprod testnet
 * → Xác nhận stack hoạt động trước khi build feature thật
 *
 * Cách chạy:
 *   1. Tạo wallet Lace, switch Preprod, xin tADA từ faucet
 *   2. Export 24-word seed phrase từ Lace → bỏ vào .env
 *   3. Đăng ký Blockfrost.io (free), lấy Preprod API key → bỏ vào .env
 *   4. npm install
 *   5. npm run hello
 *
 * Expected output:
 *   ✓ Submitted! TxHash: abc123...
 *   View on explorer: https://preprod.cardanoscan.io/transaction/abc123...
 */

import "dotenv/config";
import {
  MeshWallet,
  BlockfrostProvider,
  Transaction,
} from "@meshsdk/core";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_KEY;
const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC;

if (!BLOCKFROST_API_KEY) {
  console.error("❌ Missing BLOCKFROST_PREPROD_KEY in .env");
  console.error("→ Get free key at https://blockfrost.io/");
  process.exit(1);
}

if (!WALLET_MNEMONIC) {
  console.error("❌ Missing WALLET_MNEMONIC in .env");
  console.error("→ Export 24-word seed phrase from Lace wallet (Preprod)");
  process.exit(1);
}

async function main() {
  console.log("🚀 CertChain Hello Cardano POC\n");

  // 1. Setup provider (Blockfrost cho Preprod)
  const provider = new BlockfrostProvider(BLOCKFROST_API_KEY!);
  console.log("✓ Blockfrost provider initialized");

  // 2. Setup wallet từ seed phrase
  const wallet = new MeshWallet({
    networkId: 0, // 0 = testnet, 1 = mainnet
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: WALLET_MNEMONIC!.split(" "),
    },
  });

  const address = (await wallet.getUsedAddresses())[0];
  console.log(`✓ Wallet address: ${address}`);

  // 3. Check balance
  const balance = await wallet.getBalance();
  const adaBalance = balance.find((b) => b.unit === "lovelace");
  if (!adaBalance || BigInt(adaBalance.quantity) < 2_000_000n) {
    console.error("❌ Insufficient tADA. Need at least 2 ADA.");
    console.error("→ Get free tADA at https://docs.cardano.org/cardano-testnets/tools/faucet/");
    process.exit(1);
  }
  console.log(`✓ Balance: ${Number(adaBalance.quantity) / 1_000_000} tADA\n`);

  // 4. Build transaction với CertChain metadata (CIP-20 format)
  // ⚠️ Cardano metadata chỉ hỗ trợ string/number/array/map (KHÔNG có boolean/null)
  // ⚠️ String tối đa 64 bytes — string dài hơn phải chia thành array
  const certchainMetadata = {
    msg: ["CertChain Diploma Issuance v1 POC"],
    issuer: {
      id: "NTU-VN",
      name: "Nguyen Tat Thanh University",
      pubkey: "demo_pubkey_hash_placeholder",
    },
    credential: {
      type: "Bachelor of Computer Science",
      sid_hash: "sha256_2027CS001_salt_demo",
      name_hash: "sha256_NguyenVanHuy_salt_demo",
      major: "Computer Science",
      gpa: "3.5",
      grad_date: "2027-06-15",
      doc_hash: "sha256_originaldoc_demo",
    },
    sig: "ed25519_signature_placeholder",
    test_run: 1, // 1 = true, 0 = false (Cardano không hỗ trợ boolean)
    ts: new Date().toISOString(),
  };

  const tx = new Transaction({ initiator: wallet }).setMetadata(
    674, // Standard label cho messages (CIP-20)
    certchainMetadata
  );

  // Send 1 ADA về chính wallet (cần 1 output để build transaction)
  tx.sendLovelace(address, "1000000");

  console.log("📝 Building transaction...");
  const unsignedTx = await tx.build();

  console.log("✍️  Signing transaction...");
  const signedTx = await wallet.signTx(unsignedTx);

  console.log("📤 Submitting to Cardano Preprod...");
  const txHash = await wallet.submitTx(signedTx);

  console.log("\n✅ SUCCESS!");
  console.log(`   TxHash: ${txHash}`);
  console.log(`   Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log(`\n💡 Đợi ~30-60s để transaction confirm trên blockchain.`);
  console.log(`   Lưu txHash này lại — sẽ dùng làm proof trong V1 đề xuất!`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error("\nDebug tips:");
  console.error("  - Check tADA balance đủ chưa (cần > 2 ADA)");
  console.error("  - Blockfrost API key có đúng Preprod network không?");
  console.error("  - Seed phrase có đúng 24 từ không?");
  process.exit(1);
});