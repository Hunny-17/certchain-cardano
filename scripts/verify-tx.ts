/**
 * CertChain — Verify Transaction (utility script)
 *
 * Mục tiêu: Fetch metadata của 1 transaction từ Cardano Preprod
 * → Mô phỏng chức năng "Verifier" sẽ làm: lấy bằng từ blockchain
 *
 * Cách chạy:
 *   npm run verify -- <txHash>
 *
 * Ví dụ:
 *   npm run verify -- abc123def456...
 */

import "dotenv/config";
import { BlockfrostProvider } from "@meshsdk/core";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_KEY;
const txHash = process.argv[2];

if (!BLOCKFROST_API_KEY) {
  console.error("❌ Missing BLOCKFROST_PREPROD_KEY in .env");
  process.exit(1);
}

if (!txHash) {
  console.error("❌ Missing txHash argument");
  console.error("Usage: npm run verify -- <txHash>");
  process.exit(1);
}

async function main() {
  console.log(`🔍 Verifying transaction: ${txHash}\n`);

  const provider = new BlockfrostProvider(BLOCKFROST_API_KEY!);

  try {
    // Fetch metadata trực tiếp từ Blockfrost API
    const response = await fetch(
      `https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/metadata`,
      {
        headers: { project_id: BLOCKFROST_API_KEY! },
      }
    );

    if (!response.ok) {
      throw new Error(`Blockfrost returned ${response.status}: ${response.statusText}`);
    }

    const metadata = await response.json();

    if (!metadata || metadata.length === 0) {
      console.log("⚠️  Transaction has no metadata.");
      return;
    }

    console.log("✅ Metadata found on-chain:\n");
    console.log(JSON.stringify(metadata, null, 2));

    // Kiểm tra có phải CertChain metadata không
    const certchainEntry = metadata.find((m: any) => m.label === "674");
    if (certchainEntry?.json_metadata?.msg?.[0]?.includes("CertChain")) {
      console.log("\n🎓 This is a valid CertChain credential!");
      const cred = certchainEntry.json_metadata.credential;
      console.log(`   Type: ${cred?.type}`);
      console.log(`   Major: ${cred?.major}`);
      console.log(`   Graduation: ${cred?.graduation_date}`);
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
