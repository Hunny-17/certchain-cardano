/**
 * api/_lib/custody-wallet.ts
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Loads the CertChain custody wallet from environment variables
 * and exposes a singleton MeshWallet instance for serverless
 * functions to mint and sign on Preprod.
 *
 * âš ï¸ SECURITY: This file is `api/_lib/*` which Vercel scopes to
 * server-only â€” it is NEVER bundled into the browser. The mnemonic
 * stays in env. Do not import this file from src/.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';

// Module-level singletons (cached across warm Vercel invocations)
let _provider: BlockfrostProvider | null = null;
let _wallet: MeshWallet | null = null;

/**
 * Get Blockfrost Preprod provider singleton.
 * Reads BLOCKFROST_KEY from env, validates it's a Preprod key.
 */
export function getProvider(): BlockfrostProvider {
  if (_provider) return _provider;

  const key = process.env.BLOCKFROST_KEY;
  if (!key) {
    throw new Error('Missing BLOCKFROST_KEY in environment');
  }
  if (!key.startsWith('preprod')) {
    throw new Error(
      'BLOCKFROST_KEY must be a Preprod key (must start with "preprod"). ' +
        'Mainnet keys are rejected for safety during V2 development.'
    );
  }

  _provider = new BlockfrostProvider(key);
  return _provider;
}

/**
 * Get custody wallet singleton.
 * - Loads 24-word mnemonic from CUSTODY_WALLET_MNEMONIC env var
 * - Initialises MeshWallet with Preprod network (networkId = 0)
 * - Verifies loaded address matches CUSTODY_WALLET_ADDRESS env var
 *
 * Throws on any mismatch â€” fail fast > silent wrong wallet.
 */
export async function getCustodyWallet(): Promise<MeshWallet> {
  if (_wallet) return _wallet;

  const mnemonic = process.env.CUSTODY_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error('Missing CUSTODY_WALLET_MNEMONIC in environment');
  }

  const words = mnemonic.trim().split(/\s+/);
  if (![12, 15, 24].includes(words.length)) {
    throw new Error(
      `Invalid mnemonic word count: ${words.length}. Expected 12, 15, or 24.`
    );
  }

  const provider = getProvider();

  const wallet = new MeshWallet({
    networkId: 0, // 0 = Preprod, 1 = Mainnet
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words,
    },
  });


  // Verify address consistency â€” guards against env drift / wrong mnemonic
  const loaded = await wallet.getChangeAddress();
  const expected = process.env.CUSTODY_WALLET_ADDRESS;

  if (expected && loaded !== expected) {
    throw new Error(
      `Custody wallet address mismatch. ` +
        `Loaded: ${loaded.slice(0, 24)}... ` +
        `Expected: ${expected.slice(0, 24)}... ` +
        `Check CUSTODY_WALLET_MNEMONIC vs CUSTODY_WALLET_ADDRESS in .env.`
    );
  }

  _wallet = wallet;
  return _wallet;
}

/**
 * Convenience accessor â€” returns the base address (bech32).
 * Safe to log; addresses are public on-chain.
 */
export async function getCustodyAddress(): Promise<string> {
  const wallet = await getCustodyWallet();
  return wallet.getChangeAddress();
}

/**
 * Returns custody balance in lovelace (1 ADA = 1_000_000 lovelace).
 * Useful for pre-mint balance checks.
 */
export async function getCustodyLovelace(): Promise<bigint> {
  const wallet = await getCustodyWallet();
  const balance = await wallet.getBalance();
  const lovelace = balance.find((b) => b.unit === 'lovelace');
  return lovelace ? BigInt(lovelace.quantity) : 0n;
}