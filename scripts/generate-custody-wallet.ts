// ============================================================================
// Generate Custody Wallet for CertChain V2
// Run ONCE: npm run generate-wallet (from /backend-scripts/)
// ============================================================================

import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from /frontend/.env (parent folder)
const envPath = path.resolve('../frontend/.env');
dotenv.config({ path: envPath });

console.log(`📁 Loading .env from: ${envPath}\n`);

async function main() {
  console.log('🔐 Generating new Cardano wallet for custody...\n');

  // Step 1: Generate 24-word mnemonic
  const mnemonic = MeshWallet.brew() as string[];
  
  console.log('=== MNEMONIC (24 words) ===');
  console.log('⚠️  SAVE THIS SECURELY — anyone with these words controls the wallet');
  console.log();
  console.log(mnemonic.join(' '));
  console.log();

  // Step 2: Derive address from mnemonic
  const blockfrostKey = process.env.VITE_BLOCKFROST_KEY;
  if (!blockfrostKey) {
    console.error('❌ VITE_BLOCKFROST_KEY not found in /frontend/.env');
    console.error('   Verify the .env file exists and has VITE_BLOCKFROST_KEY set');
    process.exit(1);
  }

  console.log('📡 Deriving address using Blockfrost Preprod...');
  
  const blockfrost = new BlockfrostProvider(blockfrostKey);

  const wallet = new MeshWallet({
    networkId: 0, // 0 = Preprod testnet, 1 = Mainnet
    fetcher: blockfrost,
    submitter: blockfrost,
    key: {
      type: 'mnemonic',
      words: mnemonic,
    },
  });

  const address = await wallet.getChangeAddress();
  
  console.log();
  console.log('=== ADDRESS (Preprod) ===');
  console.log();
  console.log(address);
  console.log();
  
  console.log('=== NEXT STEPS ===');
  console.log('1. Add these 2 lines to /frontend/.env:');
  console.log();
  console.log(`CUSTODY_WALLET_MNEMONIC="${mnemonic.join(' ')}"`);
  console.log(`CUSTODY_WALLET_ADDRESS=${address}`);
  console.log();
  console.log('2. Fund from Faucet (10,000 tADA, free):');
  console.log('   https://docs.cardano.org/cardano-testnet/tools/faucet');
  console.log();
  console.log('3. Verify funding on Cardanoscan:');
  console.log(`   https://preprod.cardanoscan.io/address/${address}`);
  console.log();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});