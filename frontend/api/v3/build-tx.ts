/**
 * api/v3/build-tx.ts
 * POST /api/v3/build-tx
 *
 * Builds an UNSIGNED CIP-30 mint transaction on the server (Node.js Mesh.js),
 * returns the unsigned tx hex to the browser. The browser wallet (Eternl) then
 * signs + submits it — no private keys on the server.
 *
 * ⚠️ V3 PROTOTYPE — separate from V2 custody flow.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  Transaction,
  ForgeScript,
  BlockfrostProvider,
  resolveScriptHash,
} from "@meshsdk/core";
import type { AssetMetadata, Mint } from "@meshsdk/core";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { bech32 as bech32codec } from "bech32";

// ─── Helpers ──────────────────────────────────────────────────────

/** CIP-30 getChangeAddress() returns raw hex bytes, not bech32. Convert if needed. */
function toBech32(hex: string): string {
  if (hex.startsWith("addr") || hex.startsWith("stake")) return hex;
  const raw = Buffer.from(hex, "hex");
  const networkId = raw[0] & 0x0f;
  const hrp = networkId === 1 ? "addr" : "addr_test";
  return bech32codec.encode(hrp, bech32codec.toWords(raw), 1000);
}

// ─── Input schema ─────────────────────────────────────────────────

const BuildTxSchema = z.object({
  issuer_address: z.string().min(10),
  recipient_address: z.string().min(10),
  recipient_name: z.string().min(1).max(200),
  cert_title: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cert_type: z.string().max(100).optional(),
});

type BuildTxRequest = z.infer<typeof BuildTxSchema>;

// ─── Helpers ──────────────────────────────────────────────────────

function buildAssetName(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `CERT${ts}${rand}`;
}

// ─── Handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return void res.status(204).end();
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });

  let body: BuildTxRequest;
  try {
    body = BuildTxSchema.parse(req.body);
  } catch (err: any) {
    return void res.status(400).json({ error: "Invalid request body", details: err.errors ?? err.message });
  }

  try {
    const blockfrost = new BlockfrostProvider(process.env.BLOCKFROST_KEY!);

    const issuerBech32 = toBech32(body.issuer_address);
    const recipientBech32 = toBech32(body.recipient_address);

    // ForgeScript keyed to the ISSUER wallet — only their signature can mint
    const forgingScript = ForgeScript.withOneSignature(issuerBech32);
    const policyId = resolveScriptHash(forgingScript);
    const assetName = buildAssetName();

    const metadata: AssetMetadata = {
      name: body.cert_title.slice(0, 64),
      image: "ipfs://placeholder",
      mediaType: "image/png",
      description: `Issued by ${body.institution} on ${body.issue_date}`.slice(0, 64),
      cert_type: (body.cert_type ?? "credential").slice(0, 64),
      institution: body.institution.slice(0, 64),
      issue_date: body.issue_date,
      recipient_name: body.recipient_name.slice(0, 64),
      issuer: issuerBech32.slice(0, 64),
      recipient: recipientBech32.slice(0, 64),
    };

    const mintAsset: Mint = {
      assetName,
      assetQuantity: "1",
      metadata,
      label: "721",
      recipient: recipientBech32,
    };

    // Mock initiator — server has the issuer address, Blockfrost fetches UTxOs
    const mockInitiator = {
      getChangeAddress: async () => issuerBech32,
      getUsedAddresses: async () => [issuerBech32],
      getUnusedAddresses: async () => [],
      getUtxos: async () => blockfrost.fetchAddressUTxOs(issuerBech32),
    };

    const tx = new Transaction({
      initiator: mockInitiator as any,
      fetcher: blockfrost,
    });
    tx.mintAsset(forgingScript, mintAsset);
    tx.setMetadata(674, {
      msg: [
        "CertChain v3 prototype",
        `issuer:${issuerBech32.slice(0, 20)}`,
        `student:${recipientBech32.slice(0, 20)}`,
        `cert:${body.cert_title.slice(0, 40)}`,
      ],
    });

    const unsignedTx = await tx.build();

    return void res.status(200).json({
      unsigned_tx: unsignedTx,
      policy_id: policyId,
      asset_name: assetName,
    });
  } catch (err: any) {
    console.error("build-tx failed:", err);
    return void res.status(500).json({ error: "Build tx failed", message: err.message ?? String(err) });
  }
}
