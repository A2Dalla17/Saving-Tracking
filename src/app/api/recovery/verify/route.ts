import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const globalStore = globalThis as typeof globalThis & {
  recoveryStore?: { code: string; expiresAt: number };
};

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const input = String(code ?? "").trim();

  const supabase = getSupabaseAdmin();
  let stored: { code: string; expiresAt: number } | null = null;

  if (supabase) {
    const { data } = await supabase.from("recovery_codes").select("*").eq("id", "current").maybeSingle();
    if (data) {
      stored = { code: data.code as string, expiresAt: Number(data.expires_at) };
    }
  } else {
    stored = globalStore.recoveryStore ?? null;
  }

  if (!stored || Date.now() > stored.expiresAt) {
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }

  if (input !== stored.code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  if (supabase) {
    await supabase.from("recovery_codes").delete().eq("id", "current");
  } else {
    globalStore.recoveryStore = undefined;
  }

  return NextResponse.json({ success: true });
}
