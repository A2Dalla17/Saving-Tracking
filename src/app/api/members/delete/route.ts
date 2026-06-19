import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { deleteMemberUnified } from "@/lib/member-unified";
import { normalizeLoginId } from "@/lib/member-credentials";

/** Admin: delete Firebase Auth user AND Firestore member (one account). */
export async function POST(request: NextRequest) {
  try {
    const configError = getFirebaseAdminConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const body = (await request.json()) as { uid?: string; email?: string; loginId?: string };
    const uid = body.uid?.trim();
    const email = body.email?.trim().toLowerCase();
    const loginId = body.loginId ? normalizeLoginId(body.loginId) : undefined;

    if (!uid && !email && !loginId) {
      return NextResponse.json({ error: "UID, email, ama loginId waa lagama maarmaan" }, { status: 400 });
    }

    const result = await deleteMemberUnified({ uid, email, loginId });

    return NextResponse.json({
      ok: true,
      uid: result.uid,
      authDeleted: result.authDeleted,
      firestoreDeleted: result.firestoreDeleted,
    });
  } catch (err: unknown) {
    console.error("members/delete error:", err);
    const message = err instanceof Error ? err.message : "Isticmaalaha lama tirtiri karo";
    const status = message.includes("lama tirtiri karo") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
