/**
 * api/ipfs/upload.ts
 * ──────────────────────────────────────────────────────────────────
 * POST /api/ipfs/upload
 * Uploads a credential file (PDF/PNG/JPG) to IPFS via Pinata.
 * Requires: Authorization: Bearer <supabase_jwt> with issuer role.
 *
 * Request : multipart/form-data, field name "file", max 10 MB
 * Response: { ipfs_hash, ipfs_url, gateway_url }
 * ──────────────────────────────────────────────────────────────────
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import { readFile } from "node:fs/promises";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";
import { getPinataClient } from "../_lib/pinata.js";
import { uploadRatelimit } from "../_lib/ratelimit.js";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Auth — issuer role required
  let userId: string;
  try {
    const authResult = await requireUniversityMember(req, "issuer");
    userId = authResult.userId;
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Rate limit — keyed by userId
  const { success: rlSuccess, reset: rlReset } = await uploadRatelimit.limit(userId);
  if (!rlSuccess) {
    const retryAfter = Math.ceil((rlReset - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    return;
  }

  // Parse multipart
  const form = formidable({ maxFileSize: MAX_SIZE });
  let files: formidable.Files;
  try {
    [, files] = await form.parse(req as any);
  } catch (err: any) {
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }

  const fileList = files.file;
  const uploaded = Array.isArray(fileList) ? fileList[0] : null;
  if (!uploaded) {
    res.status(400).json({
      error: "No file provided. Send as multipart/form-data with field name 'file'.",
    });
    return;
  }

  // Validate type
  const mimeType = uploaded.mimetype ?? "";
  if (!ALLOWED_TYPES.has(mimeType)) {
    res.status(400).json({
      error: `File type not allowed: ${mimeType}. Accepted: application/pdf, image/png, image/jpeg`,
    });
    return;
  }

  // Upload to Pinata
  try {
    const buffer = await readFile(uploaded.filepath);
    const blob = new Blob([buffer], { type: mimeType });
    const fileObj = new File(
      [blob],
      uploaded.originalFilename ?? "credential",
      { type: mimeType }
    );

    const pinata = getPinataClient();
    const result = await pinata.upload.public.file(fileObj);

    res.status(200).json({
      ipfs_hash: result.cid,
      ipfs_url: `ipfs://${result.cid}`,
      gateway_url: `https://gateway.pinata.cloud/ipfs/${result.cid}`,
    });
  } catch (err: any) {
    console.error("[ipfs/upload] Pinata error:", err);
    res.status(500).json({ error: "IPFS upload failed", message: err.message });
  }
}
