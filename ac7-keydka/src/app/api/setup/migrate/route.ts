import { NextRequest, NextResponse } from "next/server";
import { importLocalDataToFirestore, type LocalCloudPayload } from "@/lib/firestore-seed";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LocalCloudPayload;
    const result = await importLocalDataToFirestore(body);

    if (result.reason === "admin-sdk-missing") {
      return NextResponse.json(
        { error: "FIREBASE_SERVICE_ACCOUNT_JSON ma jiro Vercel-ka" },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("migrate error", err);
    return NextResponse.json({ error: "Migration khalad ayaa dhacay" }, { status: 500 });
  }
}
