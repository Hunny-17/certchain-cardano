/**
 * api/mint/execute.ts
 * ────────────────────────────────────────────────────────────────
 * POST /api/mint/execute — mint a CertChain credential NFT.
 *
 * Flow:
 *   1. Validate body (Zod)
 *   2. Generate claim_code (8-char alphanumeric) + SHA-256 hash
 *   3. Load custody wallet (Mesh.js)
 *   4. Build mint tx:
 *      - Single-sig forge script (custody wallet PKH)
 *      - CIP-25 metadata (label 721) for NFT marketplaces
 *      - CIP-20 message (label 674) for claim flow + provenance
 *   5. Sign + submit via Blockfrost (Preprod)
 *   6. Insert row into Supabase `certificates` table
 *   7. Return { tx_hash, claim_code, asset_id, cardanoscan_url }
 *
 * ⚠️ claim_code is returned ONCE — issuer must save it to share
 *    with the recipient out-of-band. Only the SHA-256 hash is
 *    stored in Supabase + on-chain.
 * ────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Transaction, ForgeScript, resolvePaymentKeyHash } from "@meshsdk/core";
import type { AssetMetadata, Mint } from "@meshsdk/core";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { getCustodyWallet, getCustodyAddress } from "../_lib/custody-wallet.js";
import { getServiceClient } from "../_lib/supabase-admin.js";

// ─── Input schema ─────────────────────────────────────────────────

const MintRequestSchema = z.object({
  recipient_email: z.string().email().max(200),
  recipient_name: z.string().min(1).max(200),
  cert_title: z.string().min(1).max(200),
  institution: z.string().min(1).max(200),
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "issue_date must be YYYY-MM-DD"),
  cert_type: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

type MintRequest = z.infer<typeof MintRequestSchema>;

// ─── Helpers ──────────────────────────────────────────────────────

/** Generate 8-char alphanumeric claim code (case-insensitive friendly). */
function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  const bytes = randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Build a unique asset name from timestamp + random suffix. */
function buildAssetName(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `CERT${ts}${rand}`; // e.g. "CERTLKHJ4F9A2B"
}

/** Convert string to hex (Cardano on-chain asset name encoding). */
function toHex(str: string): string {
  return Buffer.from(str, "utf8").toString("hex");
}

// ─── Handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for local IssuerPortal dev (Vite on :5173 → API on :3000)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // 1. Validate input
  let body: MintRequest;
  try {
    body = MintRequestSchema.parse(req.body);
  } catch (err: any) {
    res.status(400).json({
      error: "Invalid request body",
      details: err.errors ?? err.message,
    });
    return;
  }

  try {
    // 2. Generate claim code + hash
    const claimCode = generateClaimCode();
    const claimCodeHash = sha256(claimCode);

    // 3. Load custody wallet
    const wallet = await getCustodyWallet();
    const custodyAddr = await getCustodyAddress();

    // 4. Build forge script (single-sig from custody wallet)
    const custodyPkh = resolvePaymentKeyHash(custodyAddr);
    const forgingScript = ForgeScript.withOneSignature(custodyAddr);

    // 5. Asset definition
    const assetNameStr = buildAssetName();
    const assetNameHex = toHex(assetNameStr);
    // In Mesh.js v1.8.x, policy_id is derived from the forge script.
    // We compute asset_id post-mint from the tx to store in Supabase.

    const cip25Metadata: AssetMetadata = {
      name: body.cert_title,
      image: "ipfs://placeholder", // V3 will upload real cert image
      mediaType: "image/png",
      description: `Issued by ${body.institution} on ${body.issue_date}`,
      // Custom CertChain fields
      cert_type: body.cert_type ?? "credential",
      institution: body.institution,
      issue_date: body.issue_date,
      recipient_name: body.recipient_name,
      // Note: recipient_email + claim_code_hash kept OFF-chain only (privacy)
    };

    const assetForMint: Mint = {
      assetName: assetNameStr,
      assetQuantity: "1",
      metadata: cip25Metadata,
      label: "721", // CIP-25 NFT standard
      recipient: custodyAddr, // Mint into custody, transfer on claim
    };

    // 6. Build transaction
    const tx = new Transaction({ initiator: wallet });
    tx.mintAsset(forgingScript, assetForMint);

    // CIP-20 message metadata (label 674) — for verifier provenance
    tx.setMetadata(674, {
      msg: [
        "CertChain v2 credential",
        `claim_hash:${claimCodeHash.slice(0, 16)}`, // first 16 hex chars only
        `issuer:${custodyAddr.slice(0, 20)}`,
      ],
    });

    // 7. Sign + submit
    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    // 8. Compute policy_id (from forge script via Mesh.js internals)
    //    policy_id = blake2b-224(script_cbor). Mesh.js exposes this differently
    //    across versions. For v1.8.14, derive via resolveScriptHash:
    const { resolveScriptHash } = await import("@meshsdk/core");
    const policyId = resolveScriptHash(forgingScript);
    const assetId = `${policyId}${assetNameHex}`;

    // 9. Insert into Supabase
    const sb = getServiceClient();
    const { error: dbError } = await sb.from("certificates").insert({
      tx_hash: txHash,
      asset_id: assetId,
      custody_address: custodyAddr,
      issuer_address: custodyAddr, // V2: custody == issuer
      recipient_address: null, // Filled on claim
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email,
      cert_title: body.cert_title,
      cert_type: body.cert_type ?? null,
      institution: body.institution,
      issue_date: body.issue_date,
      notes: body.notes ?? null,
      // PII hashes — V2 leaves null, V3 will populate when identity flow added
      name_hash: null,
      student_id_hash: null,
      dob_hash: null,
      claim_code_hash: claimCodeHash,
      status: "pending",
    });

    if (dbError) {
      // Tx already on-chain at this point — log but don't fail
      console.error("DB insert failed but tx submitted:", dbError);
      res.status(207).json({
        warning: "Tx submitted on-chain but DB insert failed",
        tx_hash: txHash,
        claim_code: claimCode,
        asset_id: assetId,
        db_error: dbError.message,
        cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      });
      return;
    }

    // 10. Success
    res.status(200).json({
      tx_hash: txHash,
      claim_code: claimCode, // ⚠️ Show once, issuer must save
      asset_id: assetId,
      policy_id: policyId,
      asset_name: assetNameStr,
      custody_address: custodyAddr,
      cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });
  } catch (err: any) {
    console.error("Mint failed:", err);
    res.status(500).json({
      error: "Mint failed",
      message: err.message ?? String(err),
    });
  }
}