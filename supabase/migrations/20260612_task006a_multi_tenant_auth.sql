-- Migration: Multi-tenant auth schema (TASK-006a)
-- Creates : universities, university_members
-- Alters  : certificates (+ university_id), audit_log (+ university_id)
-- Requires: 20260611_add_audit_log.sql already applied
-- Run in  : Supabase Dashboard > SQL Editor > New query

-- ─── Universities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS universities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  name_vi     TEXT,
  domain      TEXT        UNIQUE,          -- e.g. "vhu.edu.vn"
  logo_url    TEXT,
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── University members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS university_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id   UUID        NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'issuer'
                              CHECK (role IN ('admin', 'issuer', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, university_id)
);

-- ─── Extend existing tables ────────────────────────────────────────────────
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id);

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id);

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS universities_domain_idx
  ON universities (domain);

CREATE INDEX IF NOT EXISTS university_members_user_idx
  ON university_members (user_id);

CREATE INDEX IF NOT EXISTS university_members_university_idx
  ON university_members (university_id);

CREATE INDEX IF NOT EXISTS certificates_university_idx
  ON certificates (university_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE universities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates       ENABLE ROW LEVEL SECURITY;

-- Members read universities they belong to
CREATE POLICY "members_read_own_university"
  ON universities FOR SELECT
  USING (
    id IN (
      SELECT university_id FROM university_members
      WHERE user_id = auth.uid()
    )
  );

-- Members read their own membership row
CREATE POLICY "members_read_own_membership"
  ON university_members FOR SELECT
  USING (user_id = auth.uid());

-- Members read certificates from their university only
CREATE POLICY "members_read_university_certificates"
  ON certificates FOR SELECT
  USING (
    university_id IN (
      SELECT university_id FROM university_members
      WHERE user_id = auth.uid()
    )
  );

-- ─── Bootstrap: first super-admin ─────────────────────────────────────────
-- Run AFTER creating your account via the login UI.
-- Step 1 — insert university, copy the returned UUID:
--
--   INSERT INTO universities (name, name_vi, domain, verified)
--   VALUES ('Van Hien University', 'Trường Đại học Văn Hiến', 'vhu.edu.vn', TRUE)
--   RETURNING id;
--
-- Step 2 — look up your user UUID in Supabase Auth > Users, then:
--
--   INSERT INTO university_members (user_id, university_id, role)
--   VALUES ('<your_user_uuid>', '<university_uuid_from_step1>', 'admin');
