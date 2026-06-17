import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firestore-config";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isFirestoreEmpty } from "@/lib/firestore-seed";

export async function GET() {
  const clientFirebase = isFirebaseConfigured();
  const adminFirebase = isFirebaseAdminConfigured();
  let databaseEmpty: boolean | null = null;

  if (adminFirebase) {
    try {
      databaseEmpty = await isFirestoreEmpty();
    } catch {
      databaseEmpty = null;
    }
  }

  return NextResponse.json({
    mode: clientFirebase && adminFirebase ? "firebase" : "demo",
    clientFirebase,
    adminFirebase,
    databaseEmpty,
    ready: clientFirebase && adminFirebase && databaseEmpty === false,
  });
}
