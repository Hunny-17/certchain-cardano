/**
 * api/mint/revoke.ts
 * ────────────────────────────────────────────────────────────────
 * POST /api/mint/revoke — revoke a CertChain CIP-68 credential.
 *
 * Flow:
 *   1. Auth — issuer role, must belong to the issuing university
 *   2. Look up cert in Supabase, verify university ownership
 *   3. Derive label-100 ref asset name from the label-222 asset_id
 *   4. Fetch ref NFT UTxO from Blockfrost (at script address)
 *   5. Parse inline datum to get current cert fields
 *   6. Build spend tx:
 *      - Spend ref NFT UTxO from script address (Revoke redeemer)
 *      - Output ref NFT back to script address with status = "revoked"
 *      - Collateral from custody wallet
 *   7. Sign + submit
 *   8. Update Supabase certificates.status = "revoked"
 *   9. Return { tx_hash, asset_id, cardanoscan_url }
 *
 * ⚠️ Never modify spend/revoke logic without a Preprod test first.
 * ────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MeshTxBuilder, resolvePaymentKeyHash, mConStr2 } from "@meshsdk/core";
import type { UTxO } from "@meshsdk/core";
import { z } from "zod";
import { getCustodyWallet, getCustodyAddress, getProvider } from "../_lib/custody-wallet.js";
import { getServiceClient } from "../_lib/supabase-admin.js";
import { insertAuditLog } from "../_lib/audit-log.js";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";
import { mintRatelimit } from "../_lib/ratelimit.js";
import { buildCertDatum } from "../_lib/cip68-datum.js";

// ─── CIP-68 config ────────────────────────────────────────────────

const CIP68_LABEL_100 = "000643b0";
const CIP68_LABEL_222 = "000de140";

function getV3Config() {
  const policyId      = process.env.POLICY_ID;
  const scriptAddress = process.env.SCRIPT_ADDRESS;
  const refTxHash     = process.env.REF_SCRIPT_TX_HASH;
  const refTxIndex    = Number(process.env.REF_SCRIPT_TX_INDEX ?? "0");
  if (!policyId || !scriptAddress || !refTxHash) {
    throw new Error("Missing V3 env vars: POLICY_ID, SCRIPT_ADDRESS, REF_SCRIPT_TX_HASH");
  }
  return { policyId, scriptAddress, refTxHash, refTxIndex };
}

const _scriptHash = "b12bf31164f1290f7c7d67471422dd2932ac4f90cbaa9291d65ebeda";
const _scriptSize = "1634";

// ─── Input schema ─────────────────────────────────────────────────

const RevokeSchema = z.object({
  asset_id: z.string().trim().min(1).max(300), // label-222 user NFT asset ID
});

type RevokeRequest = z.infer<typeof RevokeSchema>;

// ─── Datum helpers ────────────────────────────────────────────────

interface CertFields {
  name: string;
  image: string;
  issuer: string;
  issuerPkh: string; // hex, 28-byte payment key hash
  issueDate: string;
  certType: string;
  recipientName: string;
  status: string;
}

/**
 * Parse the inline datum CBOR (Plutus ConStr0 indefinite array of ByteArrays).
 * Returns all 8 cert fields; issuerPkh is returned as hex (raw 28-byte binary).
 */
function parseCertDatumCbor(cborHex: string): CertFields | null {
  try {
    const buf = Buffer.from(cborHex.replace(/^0x/, ""), "hex");
    let pos = 0;
    const read = (): number => buf[pos++];

    // CBOR tag 121 (Plutus Constructor 0) = 0xd8 0x79
    if (read() !== 0xd8 || read() !== 0x79) return null;

    // Array header — major type 4, definite (0x88) or indefinite (0x9f)
    const arrayHead = read();
    if ((arrayHead >> 5) !== 4) return null;
    const ai = arrayHead & 0x1f;
    const indefinite = ai === 31;
    let count = 0;
    if (!indefinite) {
      if (ai <= 23) { count = ai; }
      else if (ai === 24) { count = read(); }
      else return null;
    }

    const rawFields: Buffer[] = [];
    let idx = 0;
    while (indefinite ? buf[pos] !== 0xff : idx < count) {
      const typeHead = read();
      const mt = typeHead >> 5;
      if (mt !== 2) return null; // expect major type 2 (bytes)
      const lenAi = typeHead & 0x1f;
      let len: number;
      if (lenAi <= 23) { len = lenAi; }
      else if (lenAi === 24) { len = read(); }
      else if (lenAi === 25) { len = (read() << 8) | read(); }
      else return null;
      rawFields.push(buf.slice(pos, pos + len));
      pos += len;
      idx++;
    }

    if (rawFields.length < 8) return null;

    const utf8 = (b: Buffer) => b.toString("utf8");
    return {
      name:          utf8(rawFields[0]),
      image:         utf8(rawFields[1]),
      issuer:        utf8(rawFields[2]),
      issuerPkh:     rawFields[3].toString("hex"), // raw bytes → hex string
      issueDate:     utf8(rawFields[4]),
      certType:      utf8(rawFields[5]),
      recipientName: utf8(rawFields[6]),
      status:        utf8(rawFields[7]),
    };
  } catch {
    return null;
  }
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
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
  const { userId, membership } = authResult;

  // Rate limit (reuse mint limiter — revocations should be rarer)
  const { success: rlSuccess, reset: rlReset } = await mintRatelimit.limit(`revoke:${userId}`);
  if (!rlSuccess) {
    const retryAfter = Math.ceil((rlReset - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    return;
  }

  // 1. Validate input
  let body: RevokeRequest;
  try {
    body = RevokeSchema.parse(req.body);
  } catch (err: any) {
    res.status(400).json({ error: "Invalid request body", details: err.errors ?? err.message });
    return;
  }

  try {
    const { policyId, scriptAddress, refTxHash, refTxIndex } = getV3Config();
    const blockfrostKey = process.env.BLOCKFROST_KEY;
    if (!blockfrostKey) throw new Error("Missing BLOCKFROST_KEY env var");

    // 2. Fetch cert from DB, check university ownership
    const sb = getServiceClient();
    const { data: certRow, error: dbFetchErr } = await sb
      .from("certificates")
      .select("university_id, status, cert_title, recipient_name")
      .eq("asset_id", body.asset_id)
      .single();

    if (dbFetchErr || !certRow) {
      res.status(404).json({ error: "Certificate not found in database" });
      return;
    }
    if (certRow.university_id !== membership.university_id) {
      await insertAuditLog({
        event_type: "revoke_unauthorized", ip_address: ip,
        error_message: `University ${membership.university_id} tried to revoke cert owned by ${certRow.university_id}`,
      });
      res.status(403).json({ error: "You can only revoke credentials issued by your institution" });
      return;
    }
    if (certRow.status === "revoked") {
      res.status(409).json({ error: "Credential is already revoked" });
      return;
    }

    // 3. Derive label-100 ref asset name from label-222 asset_id
    if (!body.asset_id.startsWith(policyId)) {
      res.status(400).json({ error: "asset_id does not match V3 policy ID" });
      return;
    }
    const assetNameHex = body.asset_id.slice(policyId.length);
    if (!assetNameHex.startsWith(CIP68_LABEL_222)) {
      res.status(400).json({ error: "asset_id is not a label-222 (user NFT) asset" });
      return;
    }
    const baseNameHex = assetNameHex.slice(CIP68_LABEL_222.length);
    const refAssetName = CIP68_LABEL_100 + baseNameHex;

    // 4. Fetch ref NFT UTxO from Blockfrost
    const BLOCKFROST_BASE = "https://cardano-preprod.blockfrost.io/api/v0";
    const utxoRes = await fetch(
      `${BLOCKFROST_BASE}/addresses/${scriptAddress}/utxos/${policyId}${refAssetName}`,
      { headers: { project_id: blockfrostKey } }
    );
    if (!utxoRes.ok) {
      const msg = utxoRes.status === 404
        ? "Reference NFT UTxO not found at script address — it may have been consumed"
        : `Blockfrost error: ${utxoRes.status}`;
      res.status(502).json({ error: msg });
      return;
    }
    const utxoList: Array<{
      tx_hash: string;
      output_index: number;
      amount: Array<{ unit: string; quantity: string }>;
      inline_datum: string | null;
    }> = await utxoRes.json();

    if (!utxoList.length) {
      res.status(404).json({ error: "No UTxO found for this reference NFT" });
      return;
    }
    const refUtxo = utxoList[0];

    // 5. Parse inline datum
    if (!refUtxo.inline_datum) {
      res.status(500).json({ error: "Reference NFT UTxO has no inline datum" });
      return;
    }
    const certFields = parseCertDatumCbor(refUtxo.inline_datum);
    if (!certFields) {
      res.status(500).json({ error: "Failed to parse inline datum CBOR" });
      return;
    }
    if (certFields.status === "revoked") {
      res.status(409).json({ error: "Credential is already revoked on-chain" });
      return;
    }

    // 6. Build spend tx
    const wallet      = await getCustodyWallet();
    const custodyAddr = await getCustodyAddress();
    const provider    = getProvider();
    const custodyPkh  = resolvePaymentKeyHash(custodyAddr);

    // Always query fresh UTxOs from Blockfrost. MeshWallet is cached between
    // warm serverless invocations and can otherwise hand the builder stale
    // inputs after several mint/revoke transactions.
    const allUtxos = await provider.fetchAddressUTxOs(custodyAddr);
    const userAssetUtxos = await provider.fetchAddressUTxOs(custodyAddr, body.asset_id);
    const byInput = new Map<string, UTxO>();
    for (const utxo of [...allUtxos, ...userAssetUtxos]) {
      byInput.set(`${utxo.input.txHash}#${utxo.input.outputIndex}`, utxo);
    }
    const walletUtxos = Array.from(byInput.values()).filter(
      (u) => !(u.input.txHash === refTxHash && u.input.outputIndex === refTxIndex)
    );

    const userAssetUtxo = walletUtxos.find((u) =>
      u.output.amount.some((a) => a.unit === body.asset_id && Number(a.quantity) > 0)
    );
    if (!userAssetUtxo) {
      res.status(409).json({
        error: "User NFT is not currently held by the custody wallet, so this credential cannot be revoked from the issuer portal.",
      });
      return;
    }

    const collateral = walletUtxos.find(
      (u) =>
        u.output.amount.length === 1 &&
        u.output.amount[0].unit === "lovelace" &&
        Number(u.output.amount[0].quantity) >= 5_000_000
    );
    if (!collateral) {
      throw new Error("No suitable collateral UTxO (≥5 ADA, pure-ADA) found in custody wallet");
    }

    // Rebuild datum with status = "revoked"
    const revokedDatum = buildCertDatum({
      name:          certFields.name,
      image:         certFields.image,
      issuer:        certFields.issuer,
      issuerPkh:     certFields.issuerPkh, // already hex
      issueDate:     certFields.issueDate,
      certType:      certFields.certType,
      recipientName: certFields.recipientName,
      status:        "revoked",
    });
    const refOutputAmount = refUtxo.amount.map((a) =>
      a.unit === "lovelace"
        ? { ...a, quantity: String(Math.max(Number(a.quantity), 2_000_000)) }
        : a
    );

    const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

    // Collateral
    txBuilder.txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    );
    const spendableUtxos = walletUtxos.filter(
      (u) =>
        !(u.input.txHash === collateral.input.txHash &&
          u.input.outputIndex === collateral.input.outputIndex)
    );

    // Spend the reference NFT UTxO from script address
    txBuilder
      .spendingPlutusScriptV3()
      .txIn(refUtxo.tx_hash, refUtxo.output_index, refUtxo.amount, scriptAddress)
      .spendingTxInReference(refTxHash, refTxIndex, _scriptSize, _scriptHash)
      .txInInlineDatumPresent()
      .txInRedeemerValue(mConStr2([]), "Mesh"); // SpendAction::Revoke = Constructor 2

    // Output ref NFT back to script address with revoked datum
    txBuilder
      .txOut(scriptAddress, refOutputAmount)
      .txOutInlineDatumValue(revokedDatum, "Mesh");

    // Custody wallet must sign (satisfies issuer_pkh check in spend validator)
    txBuilder.requiredSignerHash(custodyPkh);

    const unsignedTx = await txBuilder
      .changeAddress(custodyAddr)
      .selectUtxosFrom(spendableUtxos)
      .complete();

    // 7. Sign + submit
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash   = await wallet.submitTx(signedTx);

    // 8. Update Supabase
    const { error: dbUpdateErr } = await sb
      .from("certificates")
      .update({ status: "revoked" })
      .eq("asset_id", body.asset_id);

    if (dbUpdateErr) {
      console.error("DB update failed but revoke tx submitted:", dbUpdateErr);
      await insertAuditLog({
        event_type: "revoke_db_error", tx_hash: txHash, asset_id: body.asset_id,
        institution: membership.university.name, university_id: membership.university_id,
        ip_address: ip, error_message: dbUpdateErr.message,
      });
      res.status(207).json({
        warning: "Revoke tx submitted on-chain but DB update failed",
        tx_hash: txHash, asset_id: body.asset_id,
        db_error: dbUpdateErr.message,
        cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      });
      return;
    }

    // 9. Success
    await insertAuditLog({
      event_type: "revoke_success", tx_hash: txHash, asset_id: body.asset_id,
      institution: membership.university.name, university_id: membership.university_id,
      ip_address: ip,
      request_body: { asset_id: body.asset_id, cert_title: certRow.cert_title },
    });

    res.status(200).json({
      tx_hash:         txHash,
      asset_id:        body.asset_id,
      cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });

  } catch (err: any) {
    console.error("Revoke failed:", err);
    await insertAuditLog({
      event_type: "revoke_failure",
      asset_id: (req.body as any)?.asset_id,
      ip_address: ip,
      error_message: err.message ?? String(err),
    });
    res.status(500).json({ error: "Revoke failed. Please try again." });
  }
}
