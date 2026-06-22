"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseBrowser() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Configuration Supabase publique incomplète.");
  }

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return browserClient;
}
