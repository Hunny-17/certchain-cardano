/**
 * scripts/deploy-cip68.mjs
 * One-time script: deploy the certchain CIP-68 Plutus V3 validator
 * as a reference script on Cardano Preprod.
 *
 * Usage (run from certchain/frontend/):
 *   node --env-file=.env scripts/deploy-cip68.mjs
 *
 * Required env vars (in frontend/.env):
 *   BLOCKFROST_PREPROD_KEY
 *   CUSTODY_WALLET_MNEMONIC
 *
 * Output: writes certchain-validator/preprod-deployment.json
 */

import { BlockfrostProvider, MeshWallet, MeshTxBuilder, applyCborEncoding } from '@meshsdk/core';
import { resolvePlutusScriptAddress, deserializePlutusScript } from '@meshsdk/core-csl';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = join(__dir, '../../certchain-validator/plutus.json');
const OUTPUT_PATH = join(__dir, '../../certchain-validator/preprod-deployment.json');

// ─── Load Aiken blueprint ───────────────────────────────────────────
const blueprint = JSON.parse(readFileSync(BLUEPRINT_PATH, 'utf-8'));
const mintValidator = blueprint.validators.find(v => v.title === 'certchain.certchain.mint');
if (!mintValidator) throw new Error('certchain.certchain.mint not found in plutus.json');

const { compiledCode: rawCode } = mintValidator;
// Mesh.js requires an extra CBOR wrapping on Aiken's compiledCode
const compiledCode = applyCborEncoding(rawCode);

// ─── Resolve script hash + address (networkId 0 = Preprod/Testnet) ─
const cslScript = deserializePlutusScript(compiledCode, 'V3');
const scriptHash = cslScript.hash().to_hex();
const scriptAddress = resolvePlutusScriptAddress(
  { code: compiledCode, version: 'V3' },
  0
);

console.log('=== CertChain CIP-68 Reference Script Deployment ===');
console.log('Script hash   :', scriptHash);
console.log('Script address:', scriptAddress);

// ─── Validate env vars ──────────────────────────────────────────────
const blockfrostKey = process.env.BLOCKFROST_PREPROD_KEY;
if (!blockfrostKey) throw new Error('Missing BLOCKFROST_PREPROD_KEY in env');
if (!blockfrostKey.startsWith('preprod')) {
  throw new Error('BLOCKFROST_PREPROD_KEY must be a Preprod key');
}

const custodyMnemonic = process.env.CUSTODY_WALLET_MNEMONIC;
if (!custodyMnemonic) throw new Error('Missing CUSTODY_WALLET_MNEMONIC in env');
const words = custodyMnemonic.trim().split(/\s+/);
if (![12, 15, 24].includes(words.length)) {
  throw new Error(`Invalid mnemonic: ${words.length} words (expected 12, 15, or 24)`);
}

// ─── Setup wallet ──────────────────────────────────────────────────
const provider = new BlockfrostProvider(blockfrostKey);
const wallet = new MeshWallet({
  networkId: 0,
  fetcher: provider,
  submitter: provider,
  key: { type: 'mnemonic', words },
});

const walletAddress = await wallet.getChangeAddress();
console.log('Deploying from:', walletAddress);

// ─── Check balance ─────────────────────────────────────────────────
const balance = await wallet.getBalance();
const lovelace = balance.find(b => b.unit === 'lovelace');
const lovelaceAmt = lovelace ? BigInt(lovelace.quantity) : 0n;
console.log('Wallet balance:', (Number(lovelaceAmt) / 1_000_000).toFixed(2), 'ADA');
if (lovelaceAmt < 6_000_000n) {
  throw new Error(`Insufficient balance. Need at least 6 ADA, have ${(Number(lovelaceAmt) / 1_000_000).toFixed(2)} ADA.`);
}

// ─── Build tx: reference script locked at wallet's own address ─────
// 5 ADA minimum for a UTxO carrying a large reference script
const utxos = await wallet.getUtxos();

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
console.log('\nBuilding transaction...');
const unsignedTx = await txBuilder
  .txOut(walletAddress, [{ unit: 'lovelace', quantity: '6200000' }])
  .txOutReferenceScript(compiledCode, 'V3')
  .changeAddress(walletAddress)
  .selectUtxosFrom(utxos)
  .complete();

console.log('Signing...');
const signedTx = await wallet.signTx(unsignedTx);
console.log('Submitting...');
const txHash = await wallet.submitTx(signedTx);

// ─── Results ────────────────────────────────────────────────────────
console.log('\n✅ Reference script deployed!');
console.log('Tx hash    :', txHash);
console.log('CardanoScan:', `https://preprod.cardanoscan.io/transaction/${txHash}`);
console.log('\nWaiting for confirmation before saving...');
await new Promise(r => setTimeout(r, 5000));

const deployment = {
  scriptHash,
  scriptAddress,
  refTxHash: txHash,
  refTxIndex: 0,
  network: 'preprod',
  deployedAt: new Date().toISOString(),
};

writeFileSync(OUTPUT_PATH, JSON.stringify(deployment, null, 2));
console.log('Saved to certchain-validator/preprod-deployment.json');
console.log('\nNext step — add to frontend/.env:');
console.log(`  VITE_SCRIPT_ADDRESS="${scriptAddress}"`);
console.log(`  VITE_POLICY_ID="${scriptHash}"`);
console.log(`  VITE_REF_SCRIPT_TX="${txHash}#0"`);
