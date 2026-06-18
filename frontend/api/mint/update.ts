/**
 * POST /api/mint/update - update a V3 CIP-68 reference datum.
 *
 * This endpoint is intentionally narrow for the Phase C.6 on-chain Update test:
 * it changes only the mutable `image` field and preserves all static fields.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BlockfrostProvider, MeshTxBuilder, resolvePaymentKeyHash, mConStr0 } from "@meshsdk/core";
import type { UTxO } from "@meshsdk/core";
import { z } from "zod";
import { getCustodyWallet, getCustodyAddress } from "../_lib/custody-wallet.js";
import { getServiceClient } from "../_lib/supabase-admin.js";
import { insertAuditLog } from "../_lib/audit-log.js";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";
import { mintRatelimit } from "../_lib/ratelimit.js";
import { buildCertDatum } from "../_lib/cip68-datum.js";

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

const _scriptHash = "849a42464f285ca3e67e03d2fd974b497831a6ace8c11e1b85238f58";
const _scriptSize = "1562";

const UpdateSchema = z.object({
  asset_id: z.string().trim().min(1).max(300),
  image: z.string().trim().min(1).max(200).optional(),
});

type UpdateRequest = z.infer<typeof UpdateSchema>;

interface CertFields {
  name: string;
  image: string;
  issuer: string;
  issuerPkh: string;
  issueDate: string;
  certType: string;
  recipientName: string;
  status: string;
}

function parseCertDatumCbor(cborHex: string): CertFields | null {
  try {
    const buf = Buffer.from(cborHex.replace(/^0x/, ""), "hex");
    let pos = 0;
    const read = (): number => buf[pos++];

    if (read() !== 0xd8 || read() !== 0x79) return null;

    const arrayHead = read();
    if ((arrayHead >> 5) !== 4) return null;
    const ai = arrayHead & 0x1f;
    const indefinite = ai === 31;
    let count = 0;
    if (!indefinite) {
      if (ai <= 23) count = ai;
      else if (ai === 24) count = read();
      else return null;
    }

    const rawFields: Buffer[] = [];
    let idx = 0;
    while (indefinite ? buf[pos] !== 0xff : idx < count) {
      const typeHead = read();
      const mt = typeHead >> 5;
      if (mt !== 2) return null;
      const lenAi = typeHead & 0x1f;
      let len: number;
      if (lenAi <= 23) len = lenAi;
      else if (lenAi === 24) len = read();
      else if (lenAi === 25) len = (read() << 8) | read();
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
      issuerPkh:     rawFields[3].toString("hex"),
      issueDate:     utf8(rawFields[4]),
      certType:      utf8(rawFields[5]),
      recipientName: utf8(rawFields[6]),
      status:        utf8(rawFields[7]),
    };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket?.remoteAddress ??
    undefined;

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

  const { success: rlSuccess, reset: rlReset } = await mintRatelimit.limit(`update:${userId}`);
  if (!rlSuccess) {
    const retryAfter = Math.ceil((rlReset - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    return;
  }

  let body: UpdateRequest;
  try {
    body = UpdateSchema.parse(req.body);
  } catch (err: any) {
    res.status(400).json({ error: "Invalid request body", details: err.errors ?? err.message });
    return;
  }

  try {
    const { policyId, scriptAddress, refTxHash, refTxIndex } = getV3Config();
    const blockfrostKey = process.env.BLOCKFROST_KEY;
    if (!blockfrostKey) throw new Error("Missing BLOCKFROST_KEY env var");

    const sb = getServiceClient();
    const { data: certRow, error: dbFetchErr } = await sb
      .from("certificates")
      .select("university_id, status, cert_title")
      .eq("asset_id", body.asset_id)
      .single();

    if (dbFetchErr || !certRow) {
      res.status(404).json({ error: "Certificate not found in database" });
      return;
    }
    if (certRow.university_id !== membership.university_id) {
      await insertAuditLog({
        event_type: "update_unauthorized",
        ip_address: ip,
        error_message: `University ${membership.university_id} tried to update cert owned by ${certRow.university_id}`,
      });
      res.status(403).json({ error: "You can only update credentials issued by your institution" });
      return;
    }
    if (certRow.status === "revoked") {
      res.status(409).json({ error: "Credential is revoked and cannot be updated" });
      return;
    }

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

    const BLOCKFROST_BASE = "https://cardano-preprod.blockfrost.io/api/v0";
    const utxoRes = await fetch(
      `${BLOCKFROST_BASE}/addresses/${scriptAddress}/utxos/${policyId}${refAssetName}`,
      { headers: { project_id: blockfrostKey } },
    );
    if (!utxoRes.ok) {
      const msg = utxoRes.status === 404
        ? "Reference NFT UTxO not found at script address"
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

    const wallet      = await getCustodyWallet();
    const custodyAddr = await getCustodyAddress();
    const provider    = new BlockfrostProvider(blockfrostKey);
    const custodyPkh  = resolvePaymentKeyHash(custodyAddr);

    const allUtxos = await provider.fetchAddressUTxOs(custodyAddr);
    const userAssetUtxos = await provider.fetchAddressUTxOs(custodyAddr, body.asset_id);
    const byInput = new Map<string, UTxO>();
    for (const utxo of [...allUtxos, ...userAssetUtxos]) {
      byInput.set(`${utxo.input.txHash}#${utxo.input.outputIndex}`, utxo);
    }
    const walletUtxos = Array.from(byInput.values()).filter(
      (u) => !(u.input.txHash === refTxHash && u.input.outputIndex === refTxIndex),
    );

    const userAssetUtxo = walletUtxos.find((u) =>
      u.output.amount.some((a) => a.unit === body.asset_id && Number(a.quantity) > 0),
    );
    if (!userAssetUtxo) {
      res.status(409).json({
        error: "User NFT is not currently held by the custody wallet, so this credential cannot be updated from the issuer portal.",
      });
      return;
    }

    const collateral = walletUtxos.find(
      (u) =>
        u.output.amount.length === 1 &&
        u.output.amount[0].unit === "lovelace" &&
        Number(u.output.amount[0].quantity) >= 5_000_000,
    );
    if (!collateral) {
      throw new Error("No suitable collateral UTxO (>=5 ADA, pure-ADA) found in custody wallet");
    }

    const updatedImage = body.image ?? `ipfs://updated-${Date.now().toString(36)}`;
    const updatedDatum = buildCertDatum({
      name:          certFields.name,
      image:         updatedImage,
      issuer:        certFields.issuer,
      issuerPkh:     certFields.issuerPkh,
      issueDate:     certFields.issueDate,
      certType:      certFields.certType,
      recipientName: certFields.recipientName,
      status:        certFields.status,
    });
    const refOutputAmount = refUtxo.amount.map((a) =>
      a.unit === "lovelace"
        ? { ...a, quantity: String(Math.max(Number(a.quantity), 2_000_000)) }
        : a,
    );

    const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });

    txBuilder.txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address,
    );
    const spendableUtxos = walletUtxos.filter(
      (u) =>
        !(u.input.txHash === collateral.input.txHash &&
          u.input.outputIndex === collateral.input.outputIndex),
    );

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(refUtxo.tx_hash, refUtxo.output_index, refUtxo.amount, scriptAddress)
      .spendingTxInReference(refTxHash, refTxIndex, _scriptSize, _scriptHash)
      .txInInlineDatumPresent()
      .txInRedeemerValue(mConStr0([]), "Mesh");

    txBuilder
      .txOut(scriptAddress, refOutputAmount)
      .txOutInlineDatumValue(updatedDatum, "Mesh");

    txBuilder.requiredSignerHash(custodyPkh);

    const unsignedTx = await txBuilder
      .changeAddress(custodyAddr)
      .selectUtxosFrom(spendableUtxos)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    await insertAuditLog({
      event_type: "update_success",
      tx_hash: txHash,
      asset_id: body.asset_id,
      institution: membership.university.name,
      university_id: membership.university_id,
      ip_address: ip,
      request_body: {
        asset_id: body.asset_id,
        cert_title: certRow.cert_title,
        image: updatedImage,
      },
    });

    res.status(200).json({
      tx_hash: txHash,
      asset_id: body.asset_id,
      image: updatedImage,
      cardanoscan_url: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    });
  } catch (err: any) {
    console.error("Update failed:", err);
    await insertAuditLog({
      event_type: "update_failure",
      asset_id: (req.body as any)?.asset_id,
      ip_address: ip,
      error_message: err.message ?? String(err),
    });
    res.status(500).json({ error: "Update failed. Please try again." });
  }
}
