import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";
import { isFirestoreEmpty } from "@/lib/firestore-seed";

export async function GET() {
  const clientFirebase = isFirebaseConfigured();
  const adminSdk = isAdminSdkConfigured();
  let firestoreEmpty: boolean | null = null;

  if (adminSdk) {
    try {
      firestoreEmpty = await isFirestoreEmpty();
    } catch {
      firestoreEmpty = null;
    }
  }

  return NextResponse.json({
    mode: clientFirebase && adminSdk ? "firebase" : "demo",
    clientFirebase,
    adminSdk,
    firestoreEmpty,
    ready: clientFirebase && adminSdk && firestoreEmpty === false,
  });
}
