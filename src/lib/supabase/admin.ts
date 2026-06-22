import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configuration Supabase serveur incomplète.");
  }

  adminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
