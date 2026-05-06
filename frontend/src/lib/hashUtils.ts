// ============================================================================
// hashUtils.ts
// ----------------------------------------------------------------------------
// Browser-native SHA-256 hashing using Web Crypto API.
// Used to create privacy-preserving identity hashes that can be anchored
// on-chain without exposing sensitive PII (Student ID, DOB, etc.).
//
// V1 uses a public salt (acceptable for hackathon demo).
// V2 production should use per-issuer salts derived from issuer wallet keys.
// ============================================================================

// Public demo salt — V2 will use issuer-specific cryptographic salts.
const DEMO_SALT = "certchain-v1-public-demo-salt";

/**
 * Compute SHA-256 hex string of (input + salt).
 * Browser-native, no external library.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + DEMO_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalize input before hashing — trim whitespace, lowercase, remove diacritics.
 * Ensures "Trần Quốc Huy" and " trần quốc huy " produce same hash.
 */
export function normalizeForHash(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

/**
 * Convenience: hash with normalization applied.
 */
export async function hashIdentity(input: string): Promise<string> {
  if (!input.trim()) return "";
  return sha256(normalizeForHash(input));
}

/**
 * Compare a candidate plaintext against a stored hash.
 * Returns true if the hash of the candidate matches.
 */
export async function verifyAgainstHash(
  candidate: string,
  expectedHash: string,
): Promise<boolean> {
  if (!candidate.trim() || !expectedHash) return false;
  const candidateHash = await hashIdentity(candidate);
  return candidateHash === expectedHash;
}