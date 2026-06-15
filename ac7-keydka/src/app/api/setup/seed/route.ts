import { NextResponse } from "next/server";
import { seedSupabaseIfEmpty } from "@/lib/supabase-seed";

export async function POST() {
  try {
    const result = await seedSupabaseIfEmpty();
    if (result.reason === "admin-missing") {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY ma jiro Vercel-ka" },
        { status: 503 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("seed error", err);
    return NextResponse.json({ error: "Seed khalad ayaa dhacay" }, { status: 500 });
  }
}
