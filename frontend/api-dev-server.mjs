/**
 * api-dev-server.mjs  — Local dev-only API server for V3 prototype.
 * Runs on port 3001. Vite proxies /api/* → http://localhost:3001.
 * Run with:  node api-dev-server.mjs
 */

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bech32 as bech32codec } from 'bech32';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/);
      if (m) process.env[m[1]] ??= m[2];
    }
  } catch { /* no .env */ }
}
loadEnv();

const BLOCKFROST_KEY = process.env.BLOCKFROST_KEY;
const PORT = 3001;

// ─── Helpers ──────────────────────────────────────────────────

function buildAssetName() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString('hex').toUpperCase();
  return `CERT${ts}${rand}`;
}

function jsonResponse(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(data);
}

// ─── Address helpers ──────────────────────────────────────────

/**
 * Convert CIP-30 raw-bytes hex address to bech32.
 * CIP-30 getChangeAddress() returns the address as a hex-encoded byte string,
 * NOT bech32. The header byte's low nibble is the network id (0=testnet,1=mainnet).
 */
function toBech32(hex) {
  if (hex.startsWith('addr') || hex.startsWith('stake')) return hex;
  const raw = Buffer.from(hex, 'hex');
  const networkId = raw[0] & 0x0f;
  const hrp = networkId === 1 ? 'addr' : 'addr_test';
  return bech32codec.encode(hrp, bech32codec.toWords(raw), 1000);
}

// ─── Route: POST /api/v3/build-tx ─────────────────────────────

async function handleBuildTx(req, res) {
  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return jsonResponse(res, 400, { error: 'Invalid JSON' });
  }

  const { issuer_address, recipient_address, recipient_name, cert_title, institution, issue_date, cert_type } = body;
  if (!issuer_address || !recipient_address || !recipient_name || !cert_title) {
    return jsonResponse(res, 400, { error: 'Missing required fields' });
  }

  if (!BLOCKFROST_KEY) {
    return jsonResponse(res, 500, { error: 'BLOCKFROST_KEY not set in .env' });
  }

  try {
    const { Transaction, ForgeScript, BlockfrostProvider, resolveScriptHash } = await import('@meshsdk/core');

    // Normalize addresses: CIP-30 returns raw bytes as hex, not bech32
    const issuerBech32 = toBech32(issuer_address);
    const recipientBech32 = toBech32(recipient_address);
    console.log('[build-tx] issuer raw:', issuer_address, '→', issuerBech32);
    console.log('[build-tx] recipient raw:', recipient_address, '→', recipientBech32);

    const blockfrost = new BlockfrostProvider(BLOCKFROST_KEY);
    const forgingScript = ForgeScript.withOneSignature(issuerBech32);
    const policyId = resolveScriptHash(forgingScript);
    const assetName = buildAssetName();

    const mockInitiator = {
      getChangeAddress: async () => issuerBech32,
      getUsedAddresses: async () => [issuerBech32],
      getUnusedAddresses: async () => [],
      getUtxos: async () => blockfrost.fetchAddressUTxOs(issuerBech32),
    };

    const tx = new Transaction({ initiator: mockInitiator, fetcher: blockfrost });
    tx.mintAsset(forgingScript, {
      assetName,
      assetQuantity: '1',
      metadata: {
        name: cert_title.slice(0, 64),
        image: 'ipfs://placeholder',
        mediaType: 'image/png',
        description: `Issued by ${institution} on ${issue_date}`.slice(0, 64),
        cert_type: (cert_type ?? 'credential').slice(0, 64),
        institution: institution.slice(0, 64),
        issue_date,
        recipient_name: recipient_name.slice(0, 64),
        issuer: issuerBech32.slice(0, 64),
        recipient: recipientBech32.slice(0, 64),
      },
      label: '721',
      recipient: recipientBech32,
    });
    tx.setMetadata(674, {
      msg: [
        'CertChain v3 prototype',
        `issuer:${issuerBech32.slice(0, 20)}`,
        `student:${recipientBech32.slice(0, 20)}`,
        `cert:${cert_title.slice(0, 40)}`,
      ],
    });

    const unsignedTx = await tx.build();
    return jsonResponse(res, 200, { unsigned_tx: unsignedTx, policy_id: policyId, asset_name: assetName });
  } catch (err) {
    console.error('[build-tx] FULL ERROR:', err?.message ?? String(err));
    console.error('[build-tx] STACK:', err?.stack);
    return jsonResponse(res, 500, { error: 'Build tx failed', message: err.message ?? String(err) });
  }
}

// ─── CBOR helpers (merge unsigned tx + witness set) ──────────

/** Skip one CBOR value starting at buf[pos], return new pos. */
function cborSkip(buf, pos) {
  const b = buf[pos];
  const mt = b >> 5;
  const ai = b & 0x1f;
  let hdr, len;
  if (ai < 24)        { hdr = 1; len = ai; }
  else if (ai === 24) { hdr = 2; len = buf[pos + 1]; }
  else if (ai === 25) { hdr = 3; len = (buf[pos+1] << 8) | buf[pos+2]; }
  else if (ai === 26) { hdr = 5; len = buf.readUInt32BE(pos + 1); }
  else if (ai === 27) { hdr = 9; len = Number(buf.readBigUInt64BE(pos + 1)); } // 8-byte uint (lovelace > 2^32)
  else if (ai === 31) { hdr = 1; len = -1; } // indefinite
  else throw new Error('Unsupported CBOR ai: ' + ai);

  if (mt === 0 || mt === 1 || mt === 7) return pos + hdr;
  if (mt === 2 || mt === 3) return pos + hdr + len;
  if (mt === 6) return cborSkip(buf, pos + hdr);

  // mt 4 (array) or 5 (map)
  let p = pos + hdr;
  if (len === -1) { while (buf[p] !== 0xff) p = cborSkip(buf, p); return p + 1; }
  const items = mt === 5 ? len * 2 : len;
  for (let i = 0; i < items; i++) p = cborSkip(buf, p);
  return p;
}

/** Parse a definite-length CBOR map into an array of [keyBuf, valBuf] pairs. */
function cborParseMap(buf) {
  const b = buf[0]; const mt = b >> 5; const ai = b & 0x1f;
  if (mt !== 5) return []; // not a map → empty (e.g. null witness)
  let count, pos;
  if (ai < 24) { count = ai; pos = 1; }
  else if (ai === 24) { count = buf[1]; pos = 2; }
  else { count = (buf[1] << 8) | buf[2]; pos = 3; }
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const ks = pos; pos = cborSkip(buf, pos); const ke = pos;
    const vs = pos; pos = cborSkip(buf, pos); const ve = pos;
    pairs.push([buf.slice(ks, ke), buf.slice(vs, ve)]);
  }
  return pairs;
}

/** Encode an array of [keyBuf, valBuf] pairs as a CBOR map. */
function cborEncodeMap(pairs) {
  const n = pairs.length;
  const hdr = n < 24 ? Buffer.from([0xa0 | n])
    : n < 256 ? Buffer.from([0xb8, n])
    : Buffer.from([0xb9, (n >> 8) & 0xff, n & 0xff]);
  return Buffer.concat([hdr, ...pairs.flatMap(([k, v]) => [k, v])]);
}

/**
 * Merge unsigned Cardano tx CBOR with the witness_set returned by CIP-30 signTx.
 * CIP-30 signTx returns only the witness set; we splice it back into the tx array.
 */
function mergeTxWitnesses(unsignedTxHex, witnessSetHex) {
  const tx = Buffer.from(unsignedTxHex, 'hex');
  const ws = Buffer.from(witnessSetHex, 'hex');

  // tx = 0x84 [body] [origWitnesses] [isValid] [auxData]
  let pos = 1; // skip 0x84 array header

  const bodyEnd   = cborSkip(tx, pos);
  const bodyBytes = tx.slice(pos, bodyEnd); pos = bodyEnd;

  const origWsEnd   = cborSkip(tx, pos);
  const origWsBytes = tx.slice(pos, origWsEnd); pos = origWsEnd;

  const isValidEnd   = cborSkip(tx, pos);
  const isValidBytes = tx.slice(pos, isValidEnd); pos = isValidEnd;

  const auxBytes = tx.slice(pos);

  // Merge: keys from origWs (scripts etc.) + keys from wallet ws (vkeys)
  // Wallet ws takes priority on conflict
  const origPairs = cborParseMap(origWsBytes);
  const walletPairs = cborParseMap(ws);
  const walletKeys = new Set(walletPairs.map(([k]) => k.toString('hex')));
  const merged = [
    ...origPairs.filter(([k]) => !walletKeys.has(k.toString('hex'))),
    ...walletPairs,
  ];
  const mergedWs = cborEncodeMap(merged);

  console.log('[submit-tx] origWs keys:', origPairs.map(([k]) => k.toString('hex')));
  console.log('[submit-tx] walletWs keys:', walletPairs.map(([k]) => k.toString('hex')));

  return Buffer.concat([Buffer.from([0x84]), bodyBytes, mergedWs, isValidBytes, auxBytes]).toString('hex');
}

// ─── Route: POST /api/v3/submit-tx ───────────────────────────

async function handleSubmitTx(req, res) {
  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return jsonResponse(res, 400, { error: 'Invalid JSON' });
  }

  const { unsigned_tx, witness_set } = body;
  if (!unsigned_tx || !witness_set) {
    return jsonResponse(res, 400, { error: 'Missing unsigned_tx or witness_set' });
  }

  try {
    const signedTx = mergeTxWitnesses(unsigned_tx, witness_set);
    console.log('[submit-tx] merged tx (first 40 chars):', signedTx.slice(0, 40));

    const { BlockfrostProvider } = await import('@meshsdk/core');
    const blockfrost = new BlockfrostProvider(BLOCKFROST_KEY);
    const txHash = await blockfrost.submitTx(signedTx);
    console.log('[submit-tx] success:', txHash);
    return jsonResponse(res, 200, { tx_hash: txHash });
  } catch (err) {
    console.error('[submit-tx] error:', err?.message ?? String(err));
    return jsonResponse(res, 500, { error: 'Submit failed', message: err.message ?? String(err) });
  }
}

// ─── Server ───────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/v3/build-tx') {
    return handleBuildTx(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/v3/submit-tx') {
    return handleSubmitTx(req, res);
  }

  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[api-dev-server] listening on http://localhost:${PORT}`);
  console.log(`[api-dev-server] BLOCKFROST_KEY: ${BLOCKFROST_KEY ? BLOCKFROST_KEY.slice(0, 12) + '...' : 'NOT SET'}`);
});
