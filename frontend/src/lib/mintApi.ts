/**
 * src/lib/mintApi.ts
 * ────────────────────────────────────────────────────────────────
 * Client-side wrapper for /api/mint/execute serverless endpoint.
 * Used by IssuerPortal to mint real CertChain credentials on Preprod.
 * ────────────────────────────────────────────────────────────────
 */
import { supabase } from "./supabase";

export interface MintRequest {
  recipient_email: string;
  recipient_name: string;
  cert_title: string;
  institution: string;
  issue_date: string; // YYYY-MM-DD
  cert_type?: string;
  notes?: string;
  ipfs_hash?: string; // CID from /api/ipfs/upload — omit to keep placeholder
  _hp?: string; // honeypot — must be empty, bots fill it
}

export interface MintSuccess {
  tx_hash: string;
  claim_code: string;
  asset_id: string;
  policy_id: string;
  asset_name: string;
  custody_address: string;
  cardanoscan_url: string;
}

export interface MintError {
  error: string;
  message?: string;
  details?: unknown;
}

export interface RevokeSuccess {
  tx_hash: string;
  asset_id: string;
  cardanoscan_url: string;
}

/**
 * Revokes a V3 credential by calling the backend serverless function.
 * Updates the on-chain CIP-68 datum status to "revoked".
 * @throws Error if API returns non-2xx
 */
export async function revokeCredential(assetId: string): Promise<RevokeSuccess> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/mint/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ asset_id: assetId }),
      signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error((data as { error: string }).error || `Revoke failed (${res.status})`);
    }
    return data as RevokeSuccess;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Revoke timed out after 90s. Check Cardanoscan manually.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mints a credential by calling the backend serverless function.
 * @throws MintError-shaped error if API returns non-2xx
 */
export async function mintCertificate(req: MintRequest): Promise<MintSuccess> {
  const controller = new AbortController();
  // 90s timeout — mint can take up to 60s for Cardano confirmation
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/mint/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data as MintError;
      throw new Error(err.message || err.error || `Mint failed (${res.status})`);
    }

    return data as MintSuccess;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Mint timed out after 90s. Check Cardanoscan manually.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}