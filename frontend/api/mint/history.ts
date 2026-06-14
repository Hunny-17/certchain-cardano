import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServiceClient } from "../_lib/supabase-admin.js";
import { requireUniversityMember, AuthError } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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

  const limit = Math.min(
    Math.max(Number(req.query.limit ?? 100) || 100, 1),
    200,
  );

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("certificates")
    .select(
      [
        "tx_hash",
        "asset_id",
        "status",
        "recipient_name",
        "recipient_email",
        "cert_title",
        "cert_type",
        "institution",
        "issue_date",
        "notes",
        "created_at",
      ].join(","),
    )
    .eq("university_id", authResult.membership.university_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: "Failed to load certificate history" });
    return;
  }

  res.status(200).json({ credentials: data ?? [] });
}
