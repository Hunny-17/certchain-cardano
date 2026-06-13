import { createHash } from "node:crypto";
import { getServiceClient } from "./supabase-admin.js";

export type AuditEventType =
  | "mint_success"
  | "mint_failure"
  | "mint_db_error"
  | "revoke_success"
  | "revoke_failure"
  | "revoke_db_error"
  | "revoke_unauthorized"
  | "validation_error"
  | "auth_error";

interface AuditLogEntry {
  event_type: AuditEventType;
  tx_hash?: string;
  asset_id?: string;
  institution?: string;
  university_id?: string;
  recipient_email?: string;
  ip_address?: string;
  error_message?: string;
  request_body?: Record<string, unknown>;
}

// Never throws — audit log failure must not break the caller.
export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const sb = getServiceClient();
    await sb.from("audit_log").insert({
      event_type: entry.event_type,
      tx_hash: entry.tx_hash ?? null,
      asset_id: entry.asset_id ?? null,
      institution: entry.institution ?? null,
      university_id: entry.university_id ?? null,
      recipient_email_hash: entry.recipient_email
        ? sha256(entry.recipient_email.toLowerCase())
        : null,
      ip_address: entry.ip_address ?? null,
      error_message: entry.error_message ?? null,
      request_body: entry.request_body ?? null,
    });
  } catch (err) {
    console.error("[audit-log] insert failed:", err);
  }
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
