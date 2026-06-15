import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function hasValidEnv(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "your-supabase-url" &&
    supabaseAnonKey !== "your-anon-key" &&
    supabaseUrl !== PLACEHOLDER_URL &&
    supabaseAnonKey !== PLACEHOLDER_KEY &&
    supabaseUrl.includes("supabase.co")
  );
}

export function isSupabaseConfigured(): boolean {
  return hasValidEnv();
}

export const supabase: SupabaseClient = createClient(
  hasValidEnv() ? supabaseUrl! : PLACEHOLDER_URL,
  hasValidEnv() ? supabaseAnonKey! : PLACEHOLDER_KEY
);

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = supabase;
  }
  return client;
}

export function getSupabaseConfigStatus(): { configured: boolean; url?: string } {
  return {
    configured: isSupabaseConfigured(),
    url: isSupabaseConfigured() ? supabaseUrl : undefined,
  };
}
