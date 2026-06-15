import { NextResponse } from "next/server";
import { seedFirestoreIfEmpty } from "@/lib/firestore-seed";

export async function POST() {
  try {
    const result = await seedFirestoreIfEmpty();
    if (result.reason === "admin-sdk-missing") {
      return NextResponse.json(
        { error: "FIREBASE_SERVICE_ACCOUNT_JSON ma jiro Vercel-ka" },
        { status: 503 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("seed error", err);
    return NextResponse.json({ error: "Seed khalad ayaa dhacay" }, { status: 500 });
  }
}
