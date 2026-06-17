import { NextRequest, NextResponse } from "next/server";
import { importLocalDataToFirestore, type LocalCloudPayload } from "@/lib/firestore-seed";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LocalCloudPayload;
    const result = await importLocalDataToFirestore(body);

    if (result.reason === "admin-missing") {
      return NextResponse.json(
        { error: "Firebase admin credentials ma jiraan Vercel-ka" },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("migrate error", err);
    return NextResponse.json({ error: "Migration khalad ayaa dhacay" }, { status: 500 });
  }
}
