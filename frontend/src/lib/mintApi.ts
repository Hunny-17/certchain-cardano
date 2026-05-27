/**
 * src/lib/mintApi.ts
 * ────────────────────────────────────────────────────────────────
 * Client-side wrapper for /api/mint/execute serverless endpoint.
 * Used by IssuerPortal to mint real CertChain credentials on Preprod.
 * ────────────────────────────────────────────────────────────────
 */

export interface MintRequest {
  recipient_email: string;
  recipient_name: string;
  cert_title: string;
  institution: string;
  issue_date: string; // YYYY-MM-DD
  cert_type?: string;
  notes?: string;
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

/**
 * Mints a credential by calling the backend serverless function.
 * @throws MintError-shaped error if API returns non-2xx
 */
export async function mintCertificate(req: MintRequest): Promise<MintSuccess> {
  const controller = new AbortController();
  // 90s timeout — mint can take up to 60s for Cardano confirmation
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const apiBase = "";
    const res = await fetch(`${apiBase}/api/mint/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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