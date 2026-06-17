import { NextResponse } from "next/server";
import { getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { seedFirestoreIfEmpty } from "@/lib/firestore-seed";

export async function POST() {
  try {
    const configError = getFirebaseAdminConfigError();
    if (configError) {
      console.error("setup/seed:", configError);
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const result = await seedFirestoreIfEmpty();
    if (result.reason === "admin-missing") {
      return NextResponse.json(
        { error: getFirebaseAdminConfigError() ?? "Firebase admin credentials ma jiraan" },
        { status: 503 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("seed error", err);
    const message = err instanceof Error ? err.message : "Seed khalad ayaa dhacay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
