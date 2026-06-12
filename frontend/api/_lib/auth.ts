/**
 * api/_lib/auth.ts
 * ──────────────────────────────────────────────────────────────────
 * Auth middleware for Vercel serverless functions.
 * Verifies Supabase JWT and loads university membership.
 *
 * Usage:
 *   const { userId, membership } = await requireUniversityMember(req, 'issuer');
 *   // membership.university.name is the verified institution name
 * ──────────────────────────────────────────────────────────────────
 */

import type { VercelRequest } from "@vercel/node";
import { getServiceClient } from "./supabase-admin.js";

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
    this.name = "AuthError";
  }
}

export interface UniversityMembership {
  user_id: string;
  university_id: string;
  role: "admin" | "issuer" | "viewer";
  university: {
    id: string;
    name: string;
    name_vi: string | null;
    domain: string | null;
    verified: boolean;
  };
}

export interface AuthResult {
  userId: string;
  membership: UniversityMembership;
}

/**
 * Verifies the Bearer JWT in Authorization header, then loads the
 * caller's university membership. Throws AuthError on any failure.
 *
 * @param requiredRole  If set, the caller must have this role (or 'admin').
 */
export async function requireUniversityMember(
  req: VercelRequest,
  requiredRole?: "admin" | "issuer"
): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", 401);
  }
  const jwt = authHeader.slice(7);

  const sb = getServiceClient();

  const { data: { user }, error: userError } = await sb.auth.getUser(jwt);
  if (userError || !user) {
    throw new AuthError("Invalid or expired token", 401);
  }

  const { data: row, error: memberError } = await sb
    .from("university_members")
    .select("user_id, university_id, role, universities!inner(id, name, name_vi, domain, verified)")
    .eq("user_id", user.id)
    .single();

  if (memberError || !row) {
    throw new AuthError("No university membership found for this account", 403);
  }

  const university = (row as any).universities as UniversityMembership["university"];

  if (!university.verified) {
    throw new AuthError("University not yet verified by admin", 403);
  }

  if (requiredRole && row.role !== "admin" && row.role !== requiredRole) {
    throw new AuthError(`Requires role: ${requiredRole}`, 403);
  }

  return {
    userId: user.id,
    membership: {
      user_id: row.user_id,
      university_id: row.university_id,
      role: row.role as UniversityMembership["role"],
      university,
    },
  };
}
