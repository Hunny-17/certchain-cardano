/**
 * api/mint/execute.ts
 * ────────────────────────────────────────────────────────────────
 * POST /api/mint/execute — mint a CertChain CIP-68 credential.
 *
 * Flow:
 *   1. Validate body (Zod)
 *   2. Generate claim_code (8-char) + SHA-256 hash
 *   3. Load custody wallet (Mesh.js)
 *   4. Build CIP-68 mint tx (MeshTxBuilder):
 *      - Reference script from deployed UTxO (TASK-V3-002)
 *      - label-100 (ref NFT) → script address with inline CertDatum
 *      - label-222 (user NFT) → custody wallet
 *   5. Sign + submit via Blockfrost (Preprod)
 *   6. Insert row into Supabase `certificates` table
 *   7. Return { tx_hash, claim_code, asset_id, policy_id, cardanoscan_url }
 *
 * ⚠️ claim_code returned ONCE — issuer must save it.
 * ⚠️ Never modify mint logic without a Preprod test first.
 * ────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MeshTxBuilder,
  BlockfrostProvider,
  applyCborEncoding,
  resolvePaymentKeyHash,
} from "@meshsdk/core";
import { mConStr0 } from "@meshsdk/core";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { getCustodyWallet, getCustodyAddress, getProvider } from "../_lib/custody-wallet.js";
import { getServiceClient } from "../_lib/supabase-admin.js";
import { insertAuditLog } from "../_lib/audit-log.js";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";
import { mintRatelimit } from "../_lib/ratelimit.js";
import { buildCip68AssetNames, buildCertDatum } from "../_lib/cip68-datum.js";

// ─── CIP-68 config (from env, written by TASK-V3-002 deployment) ──

function getV3Config() {
  const policyId      = process.env.POLICY_ID;
  const scriptAddress = process.env.SCRIPT_ADDRESS;
  const refTxHash     = process.env.REF_SCRIPT_TX_HASH;
  const refTxIndex    = Number(process.env.REF_SCRIPT_TX_INDEX ?? "0");

  if (!policyId || !scriptAddress || !refTxHash) {
    throw new Error(
      "Missing V3 env vars: POLICY_ID, SCRIPT_ADDRESS, REF_SCRIPT_TX_HASH"
    );
  }
  return { policyId, scriptAddress, refTxHash, refTxIndex };
}

// Constants from certchain-validator/plutus.json (certchain.certchain.mint)
// Hardcoded to avoid filesystem access in Vercel serverless environment
const _scriptHash = "849a42464f285ca3e67e03d2fd974b497831a6ace8c11e1b85238f58";
const _scriptSize = "1562"; // bytes of on-chain script CBOR (verified from certchain-validator/plutus.json)

// ─── Input schema ─────────────────────────────────────────────────

const MintRequestSchema = z.object({
  recipient_email: z.string().trim().email().max(200),
  recipient_name:  z.string().trim().min(1).max(200),
  cert_title:      z.string().trim().min(1).max(200),
  institution:     z.string().trim().min(1).max(200),
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "issue_date must be YYYY-MM-DD")
    .refine((s) => !isNaN(new Date(s).getTime()), "issue_date not a valid date")
    .refine((s) => {
      const d   = new Date(s + "T00:00:00Z");
      const min = new Date("1900-01-01T00:00:00Z");
      const max = new Date();
      max.setFullYear(max.getFullYear() + 1);
      return d >= min && d <= max;
    }, "issue_date must be between 1900-01-01 and 1 year from today"),
  cert_type:  z.string().trim().max(100).optional(),
  notes:      z.string().trim().max(1000).optional(),
  ipfs_hash:  z.string().trim().max(200).optional(),
});

type MintRequest = z.infer<typeof MintRequestSchema>;

// ─── Helpers ──────────────────────────────────────────────────────

function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Base name ≤ 28 bytes (CIP-68 prefix takes 4 bytes of the 32-byte limit). */
function buildBaseName(): string {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `CERT${ts}${rand}`; // e.g. "CERTLKHJ4F9A2B" (14 chars, well within 28)
}

// ─── Handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket?.remoteAddress ??
    undefined;

  // 0. Auth
  let authResult: Awaited<ReturnType<typeof requireUniversityMember>>;
  try {
    authResult = await requireUniversityMember(req, "issuer");
  } catch (err) {
    if (err instanceof AuthError) {
      await insertAuditLog({ event_type: "auth_error", ip_address: ip, error_message: err.message });
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
  const { userId, membership } = authResult;

  // Rate limit
  const { success: rlSuccess, reset: rlReset } = await mintRatelimit.limit(userId);
  if (!rlSuccess) {
    const retryAfter = Math.ceil((rlReset - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    return;
  }

  // Honeypot
  if (typeof req.body?._hp === "string" && req.body._hp.trim().length > 0) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  // 1. Validate input
  let body: MintRequest;
  try {
    body = MintRequestSchema.parse(req.body);
  } catch (err: any) {
    await insertAuditLog({
      event_type: "validation_error", ip_address: ip,
      error_message: JSON.stringify(err.errors ?? err.message),
    });
    res.status(400).json({ error: "Invalid request body", details: err.errors ?? err.message });
    return;
  }

  try {
    const { policyId, scriptAddress, refTxHash, refTxIndex } = getV3Config();
    const institutionName = membership.university.name;

    // 2. Claim code
    const claimCode     = generateClaimCode();
    const claimCodeHash = sha256(claimCode);

    // 3. Wallet + provider
    const wallet     = await getCustodyWallet();
    const custodyAddr = await getCustodyAddress();
    const provider   = getProvider();
    const custodyPkh = resolvePaymentKeyHash(custodyAddr);

    // 4. CIP-68 asset names
    const baseName = buildBaseName();
    const { refAssetName, userAssetName } = buildCip68AssetNames(baseName);

    // 5. CertDatum for the reference NFT
    const image = body.ipfs_hash ? `ipfs://${body.ipfs_hash}` : "ipfs://placeholder";
    const certDatum = buildCertDatum({
      name:          body.cert_title,
      image,
      issuer:        institutionName,
      issuerPkh:     custodyPkh,
      issueDate:     body.issue_date,
      certType:      body.cert_type ?? "credential",
      recipientName: body.recipient_name,
      status:        "active",
    });

    // 6. Build CIP-68 mint tx
    const allUtxos = await wallet.getUtxos();
    // Exclude the reference script UTxO so coin selection doesn't spend it
    const utxos = allUtxos.filter(
      (u) => !(u.input.txHash === refTxHash && u.input.outputIndex === refTxIndex)
    );

    const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

    // Plutus scripts require a collateral UTxO (pure-ADA, no native assets)
    const collateral = utxos.find(
      (u) =>
        u.output.amount.length === 1 &&
        u.output.amount[0].unit === "lovelace" &&
        Number(u.output.amount[0].quantity) >= 5_000_000
    );
    if (!collateral) {
      throw new Error("No suitable collateral UTxO (≥5 ADA, pure-ADA) found in custody wallet");
    }
    txBuilder.txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    );
    const spendableUtxos = utxos.filter(
      (u) =>
        !(u.input.txHash === collateral.input.txHash &&
          u.input.outputIndex === collateral.input.outputIndex)
    );

    // Mint label-100 (reference NFT)
    txBuilder
      .mintPlutusScriptV3()
      .mint("1", policyId, refAssetName)
      .mintTxInReference(refTxHash, refTxIndex, _scriptSize, _scriptHash)
      .mintReferenceTxInRedeemerValue(mConStr0([]), "Mesh");

    // Mint label-222 (user NFT) — same policy, same redeemer key
    txBuilder
      .mintPlutusScriptV3()
      .mint("1", policyId, userAssetName)
      .mintTxInReference(refTxHash, refTxIndex, _scriptSize, _scriptHash)
      .mintReferenceTxInRedeemerValue(mConStr0([]), "Mesh");

    // Output: ref NFT locked at script address with inline CertDatum
    txBuilder
      .txOut(scriptAddress, [{ unit: policyId + refAssetName, quantity: "1" }])
      .txOutInlineDatumValue(certDatum, "Mesh");

    // Output: user NFT to custody wallet
    txBuilder.txOut(custodyAddr, [{ unit: policyId + userAssetName, quantity: "1" }]);

    // Custody wallet must sign (required by spend validator issuer_pkh check)
    txBuilder.requiredSignerHash(custodyPkh);

    const unsignedTx = await txBuilder
      .changeAddress(custodyAddr)
      .selectUtxosFrom(spendableUtxos)
      .complete();

    // 7. Sign + submit
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash   = await wallet.submitTx(signedTx);

    // asset_id uses the user NFT (222 token) — the holder's ownership token
    const assetId = `${policyId}${userAssetName}`;

    // 8. Insert into Supabase
    const sb = getServiceClient();
    const { error: dbError } = await sb.from("certificates").insert({
      tx_hash:          txHash,
      asset_id:         assetId,
      custody_address:  custodyAddr,
      issuer_address:   custodyAddr,
      recipient_address: null,
      recipient_name:   body.recipient_name,
      recipient_email:  body.recipient_email,
      cert_title:       body.cert_title,
      cert_type:        body.cert_type ?? null,
      institution:      institutionName,
      university_id:    membership.university_id,
      issue_date:       body.issue_date,
      notes:            body.notes ?? null,
      name_hash:        null,
      student_id_hash:  null,
      dob_hash:         null,
      claim_code_hash:  claimCodeHash,
      status:           "pending",
    });

    if (dbError) {
      console.error("DB insert failed but tx submitted:", dbError);
      await insertAuditLog({
        event_type: "mint_db_error", tx_hash: txHash, asset_id: assetId,
        institution: institutionName, university_id: membership.university_id,
        recipient_email: body.recipient_email, ip_address: ip,
        error_message: dbError.message,
        request_body: { cert_title: body.cert_title, institution: institutionName, issue_date: body.issue_date },
      });
      res.status(207).json({
        warning: "Tx submitted on-chain but DB insert failed",
        tx_hash: txHash, claim_code: claimCode, asset_id: assetId,
        db_error: dbError.message,
        version: "v3",
        cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      });
      return;
    }

    // 9. Success
    await insertAuditLog({
      event_type: "mint_success", tx_hash: txHash, asset_id: assetId,
      institution: institutionName, university_id: membership.university_id,
      recipient_email: body.recipient_email, ip_address: ip,
      request_body: { cert_title: body.cert_title, institution: institutionName, issue_date: body.issue_date },
    });

    res.status(200).json({
      tx_hash:         txHash,
      claim_code:      claimCode,
      asset_id:        assetId,
      policy_id:       policyId,
      asset_name:      baseName,
      custody_address: custodyAddr,
      version:         "v3",
      cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });

  } catch (err: any) {
    console.error("Mint failed:", err);
    await insertAuditLog({
      event_type: "mint_failure",
      institution: (req.body as any)?.institution,
      recipient_email: (req.body as any)?.recipient_email,
      ip_address: ip,
      error_message: err.message ?? String(err),
    });
    res.status(500).json({ error: "Mint failed. Please try again." });
  }
}
