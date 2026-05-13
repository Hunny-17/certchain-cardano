/**
 * api/_lib/supabase-admin.ts
 * ──────────────────────────────────────────────────────────────
 * Server-only Supabase client with service_role key (bypasses RLS).
 *
 * ⚠️ NEVER import from src/ — service_role key bypasses all
 * row-level security. Browser must use the anon client in
 * src/lib/supabase.ts instead.
 * ──────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  // Belt-and-suspenders: refuse to run in browser context
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServiceClient() called from browser context. ' +
        'service_role key must NEVER be exposed to the frontend. ' +
        'Use src/lib/supabase.ts (anon client) instead.'
    );
  }

  if (_client) return _client;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_URL in environment');
  }
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  _client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}