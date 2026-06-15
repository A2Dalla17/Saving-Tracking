import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { isSupabaseEmpty } from "@/lib/supabase-seed";

export async function GET() {
  const clientSupabase = isSupabaseConfigured();
  const adminSupabase = isSupabaseAdminConfigured();
  let databaseEmpty: boolean | null = null;

  if (adminSupabase) {
    try {
      databaseEmpty = await isSupabaseEmpty();
    } catch {
      databaseEmpty = null;
    }
  }

  return NextResponse.json({
    mode: clientSupabase && adminSupabase ? "supabase" : "demo",
    clientSupabase,
    adminSupabase,
    databaseEmpty,
    ready: clientSupabase && adminSupabase && databaseEmpty === false,
  });
}
