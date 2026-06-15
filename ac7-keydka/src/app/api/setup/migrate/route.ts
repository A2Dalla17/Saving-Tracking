import { NextRequest, NextResponse } from "next/server";
import { importLocalDataToSupabase, type LocalCloudPayload } from "@/lib/supabase-seed";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LocalCloudPayload;
    const result = await importLocalDataToSupabase(body);

    if (result.reason === "admin-missing") {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY ma jiro Vercel-ka" },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("migrate error", err);
    return NextResponse.json({ error: "Migration khalad ayaa dhacay" }, { status: 500 });
  }
}
