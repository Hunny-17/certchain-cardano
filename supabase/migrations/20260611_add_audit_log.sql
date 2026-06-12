-- Migration: add audit_log table
-- TASK-002: Audit Log
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS audit_log (
  id                   BIGSERIAL PRIMARY KEY,
  event_type           TEXT        NOT NULL,   -- 'mint_success' | 'mint_failure' | 'mint_db_error' | 'validation_error'
  tx_hash              TEXT,                   -- null when tx never reached chain
  asset_id             TEXT,
  institution          TEXT,
  recipient_email_hash TEXT,                   -- sha256(lowercase email) — never store raw email
  ip_address           TEXT,                   -- preserved for TASK-005 rate-limit analysis
  error_message        TEXT,
  request_body         JSONB,                  -- sanitized body (email stripped)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the most common query patterns
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx  ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx  ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_institution_idx ON audit_log (institution);

-- RLS: enable but grant no public policy — only service_role can read/write
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
