import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    ok: true,
    has_blockfrost: !!process.env.BLOCKFROST_KEY,
    has_custody_mnemonic: !!process.env.CUSTODY_WALLET_MNEMONIC,
    has_custody_address: !!process.env.CUSTODY_WALLET_ADDRESS,
    has_supabase_url: !!process.env.VITE_SUPABASE_URL,
    has_supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    custody_address_prefix: process.env.CUSTODY_WALLET_ADDRESS?.slice(0, 12) ?? null,
  });
}