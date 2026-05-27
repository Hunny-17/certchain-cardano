/**
 * api/v3/submit-tx.ts
 * POST /api/v3/submit-tx
 *
 * Merges the CIP-30 wallet witness set back into the unsigned tx CBOR,
 * then submits the fully-signed transaction via Blockfrost.
 *
 * CIP-30 signTx() returns only the witness_set (CBOR map), not a full tx.
 * We splice it back into the [body, witnesses, isValid, auxData] array.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BlockfrostProvider } from "@meshsdk/core";

// ─── CBOR helpers ─────────────────────────────────────────────────

function cborSkip(buf: Buffer, pos: number): number {
  const b = buf[pos];
  const mt = b >> 5;
  const ai = b & 0x1f;
  let hdr: number, len: number;
  if (ai < 24)        { hdr = 1; len = ai; }
  else if (ai === 24) { hdr = 2; len = buf[pos + 1]; }
  else if (ai === 25) { hdr = 3; len = (buf[pos + 1] << 8) | buf[pos + 2]; }
  else if (ai === 26) { hdr = 5; len = buf.readUInt32BE(pos + 1); }
  else if (ai === 27) { hdr = 9; len = Number(buf.readBigUInt64BE(pos + 1)); }
  else if (ai === 31) { hdr = 1; len = -1; }
  else throw new Error("Unsupported CBOR ai: " + ai);

  if (mt === 0 || mt === 1 || mt === 7) return pos + hdr;
  if (mt === 2 || mt === 3) return pos + hdr + len;
  if (mt === 6) return cborSkip(buf, pos + hdr);

  let p = pos + hdr;
  if (len === -1) { while (buf[p] !== 0xff) p = cborSkip(buf, p); return p + 1; }
  const items = mt === 5 ? len * 2 : len;
  for (let i = 0; i < items; i++) p = cborSkip(buf, p);
  return p;
}

function cborParseMap(buf: Buffer): [Buffer, Buffer][] {
  const b = buf[0]; const mt = b >> 5; const ai = b & 0x1f;
  if (mt !== 5) return [];
  let count: number, pos: number;
  if (ai < 24)        { count = ai; pos = 1; }
  else if (ai === 24) { count = buf[1]; pos = 2; }
  else                { count = (buf[1] << 8) | buf[2]; pos = 3; }
  const pairs: [Buffer, Buffer][] = [];
  for (let i = 0; i < count; i++) {
    const ks = pos; pos = cborSkip(buf, pos); const ke = pos;
    const vs = pos; pos = cborSkip(buf, pos); const ve = pos;
    pairs.push([buf.slice(ks, ke), buf.slice(vs, ve)]);
  }
  return pairs;
}

function cborEncodeMap(pairs: [Buffer, Buffer][]): Buffer {
  const n = pairs.length;
  const hdr = n < 24 ? Buffer.from([0xa0 | n])
    : n < 256 ? Buffer.from([0xb8, n])
    : Buffer.from([0xb9, (n >> 8) & 0xff, n & 0xff]);
  return Buffer.concat([hdr, ...pairs.flatMap(([k, v]) => [k, v])]);
}

function mergeTxWitnesses(unsignedTxHex: string, witnessSetHex: string): string {
  const tx = Buffer.from(unsignedTxHex, "hex");
  const ws = Buffer.from(witnessSetHex, "hex");

  let pos = 1; // skip 0x84 array header
  const bodyEnd = cborSkip(tx, pos);
  const bodyBytes = tx.slice(pos, bodyEnd); pos = bodyEnd;

  const origWsEnd = cborSkip(tx, pos);
  const origWsBytes = tx.slice(pos, origWsEnd); pos = origWsEnd;

  const isValidEnd = cborSkip(tx, pos);
  const isValidBytes = tx.slice(pos, isValidEnd); pos = isValidEnd;

  const auxBytes = tx.slice(pos);

  const origPairs = cborParseMap(origWsBytes);
  const walletPairs = cborParseMap(ws);
  const walletKeys = new Set(walletPairs.map(([k]) => k.toString("hex")));
  const merged: [Buffer, Buffer][] = [
    ...origPairs.filter(([k]) => !walletKeys.has(k.toString("hex"))),
    ...walletPairs,
  ];
  const mergedWs = cborEncodeMap(merged);

  return Buffer.concat([Buffer.from([0x84]), bodyBytes, mergedWs, isValidBytes, auxBytes]).toString("hex");
}

// ─── Handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return void res.status(204).end();
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });

  const { unsigned_tx, witness_set } = req.body ?? {};
  if (!unsigned_tx || !witness_set) {
    return void res.status(400).json({ error: "Missing unsigned_tx or witness_set" });
  }

  try {
    const signedTx = mergeTxWitnesses(unsigned_tx, witness_set);
    const blockfrost = new BlockfrostProvider(process.env.BLOCKFROST_KEY!);
    const txHash = await blockfrost.submitTx(signedTx);
    return void res.status(200).json({ tx_hash: txHash });
  } catch (err: any) {
    console.error("submit-tx failed:", err);
    return void res.status(500).json({ error: "Submit failed", message: err.message ?? String(err) });
  }
}
