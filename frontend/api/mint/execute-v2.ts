/**
 * POST /api/mint/execute-v2 - mint a legacy CertChain CIP-25 credential NFT.
 *
 * This endpoint keeps the pre-CIP-68 mint path available for the Issuer Portal
 * version picker. V2 credentials are immutable and cannot be revoked on-chain.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Transaction, ForgeScript } from "@meshsdk/core";
import type { AssetMetadata, Mint } from "@meshsdk/core";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { getCustodyWallet, getCustodyAddress } from "../_lib/custody-wallet.js";
import { getServiceClient } from "../_lib/supabase-admin.js";
import { insertAuditLog } from "../_lib/audit-log.js";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";
import { mintRatelimit } from "../_lib/ratelimit.js";

const MintRequestSchema = z.object({
  recipient_email: z.string().trim().email().max(200),
  recipient_name: z.string().trim().min(1, "recipient_name cannot be blank").max(200),
  cert_title: z.string().trim().min(1, "cert_title cannot be blank").max(200),
  institution: z.string().trim().min(1, "institution cannot be blank").max(200),
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "issue_date must be YYYY-MM-DD")
    .refine((s) => !isNaN(new Date(s).getTime()), "issue_date is not a valid calendar date")
    .refine((s) => {
      const d = new Date(s + "T00:00:00Z");
      const min = new Date("1900-01-01T00:00:00Z");
      const max = new Date();
      max.setFullYear(max.getFullYear() + 1);
      return d >= min && d <= max;
    }, "issue_date must be between 1900-01-01 and 1 year from today"),
  cert_type: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  ipfs_hash: z.string().trim().max(200).optional(),
});

type MintRequest = z.infer<typeof MintRequestSchema>;

function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function buildAssetName(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `CERT${ts}${rand}`;
}

function toHex(str: string): string {
  return Buffer.from(str, "utf8").toString("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket?.remoteAddress ??
    undefined;

  let authResult: Awaited<ReturnType<typeof requireUniversityMember>>;
  try {
    authResult = await requireUniversityMember(req, "issuer");
  } catch (err) {
    if (err instanceof AuthError) {
      await insertAuditLog({
        event_type: "auth_error",
        ip_address: ip,
        error_message: err.message,
      });
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
  const { userId, membership } = authResult;

  const { success: rlSuccess, reset: rlReset } = await mintRatelimit.limit(`v2:${userId}`);
  if (!rlSuccess) {
    const retryAfter = Math.ceil((rlReset - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    return;
  }

  if (typeof req.body?._hp === "string" && req.body._hp.trim().length > 0) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  let body: MintRequest;
  try {
    body = MintRequestSchema.parse(req.body);
  } catch (err: any) {
    await insertAuditLog({
      event_type: "validation_error",
      ip_address: ip,
      error_message: JSON.stringify(err.errors ?? err.message),
    });
    res.status(400).json({
      error: "Invalid request body",
      details: err.errors ?? err.message,
    });
    return;
  }

  try {
    const claimCode = generateClaimCode();
    const claimCodeHash = sha256(claimCode);
    const wallet = await getCustodyWallet();
    const custodyAddr = await getCustodyAddress();
    const forgingScript = ForgeScript.withOneSignature(custodyAddr);
    const assetNameStr = buildAssetName();
    const assetNameHex = toHex(assetNameStr);
    const institutionName = membership.university.name;

    const cip25Metadata: AssetMetadata = {
      name: body.cert_title,
      image: body.ipfs_hash ? `ipfs://${body.ipfs_hash}` : "ipfs://placeholder",
      mediaType: "image/png",
      description: `Issued by ${institutionName} on ${body.issue_date}`,
      cert_type: body.cert_type ?? "credential",
      institution: institutionName,
      issue_date: body.issue_date,
      recipient_name: body.recipient_name,
    };

    const assetForMint: Mint = {
      assetName: assetNameStr,
      assetQuantity: "1",
      metadata: cip25Metadata,
      label: "721",
      recipient: custodyAddr,
    };

    const tx = new Transaction({ initiator: wallet });
    tx.mintAsset(forgingScript, assetForMint);
    tx.setMetadata(674, {
      msg: [
        "CertChain v2 credential",
        `claim_hash:${claimCodeHash.slice(0, 16)}`,
        `issuer:${custodyAddr.slice(0, 20)}`,
      ],
    });

    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    const { resolveScriptHash } = await import("@meshsdk/core");
    const policyId = resolveScriptHash(forgingScript);
    const assetId = `${policyId}${assetNameHex}`;

    const sb = getServiceClient();
    const { error: dbError } = await sb.from("certificates").insert({
      tx_hash: txHash,
      asset_id: assetId,
      custody_address: custodyAddr,
      issuer_address: custodyAddr,
      recipient_address: null,
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email,
      cert_title: body.cert_title,
      cert_type: body.cert_type ?? null,
      institution: institutionName,
      university_id: membership.university_id,
      issue_date: body.issue_date,
      notes: body.notes ?? null,
      name_hash: null,
      student_id_hash: null,
      dob_hash: null,
      claim_code_hash: claimCodeHash,
      status: "pending",
    });

    if (dbError) {
      console.error("V2 DB insert failed but tx submitted:", dbError);
      await insertAuditLog({
        event_type: "mint_db_error",
        tx_hash: txHash,
        asset_id: assetId,
        institution: institutionName,
        university_id: membership.university_id,
        recipient_email: body.recipient_email,
        ip_address: ip,
        error_message: dbError.message,
        request_body: { version: "v2" },
      });
      res.status(207).json({
        warning: "Tx submitted on-chain but DB insert failed",
        tx_hash: txHash,
        claim_code: claimCode,
        asset_id: assetId,
        policy_id: policyId,
        asset_name: assetNameStr,
        custody_address: custodyAddr,
        db_error: dbError.message,
        version: "v2",
        cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      });
      return;
    }

    await insertAuditLog({
      event_type: "mint_success",
      tx_hash: txHash,
      asset_id: assetId,
      institution: institutionName,
      university_id: membership.university_id,
      recipient_email: body.recipient_email,
      ip_address: ip,
      request_body: {
        cert_title: body.cert_title,
        institution: institutionName,
        issue_date: body.issue_date,
        cert_type: body.cert_type,
        version: "v2",
      },
    });

    res.status(200).json({
      tx_hash: txHash,
      claim_code: claimCode,
      asset_id: assetId,
      policy_id: policyId,
      asset_name: assetNameStr,
      custody_address: custodyAddr,
      version: "v2",
      cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });
  } catch (err: any) {
    console.error("V2 mint failed:", err);
    await insertAuditLog({
      event_type: "mint_failure",
      institution: (req.body as any)?.institution,
      recipient_email: (req.body as any)?.recipient_email,
      ip_address: ip,
      error_message: err.message ?? String(err),
      request_body: { version: "v2" },
    });
    res.status(500).json({ error: "V2 mint failed. Please try again." });
  }
}
