import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { updateMemberPasswordUnified } from "@/lib/member-unified";

/** Admin: update Firebase Auth password for members/{uid}. */
export async function POST(request: NextRequest) {
  try {
    const configError = getFirebaseAdminConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const body = (await request.json()) as { uid?: string; password?: string };
    const uid = body.uid?.trim();
    const password = body.password ?? "";

    if (!uid) {
      return NextResponse.json({ error: "UID waa lagama maarmaan" }, { status: 400 });
    }

    await updateMemberPasswordUnified(uid, password);

    return NextResponse.json({ ok: true, uid });
  } catch (err) {
    console.error("members/update-password error:", err);
    const message = err instanceof Error ? err.message : "Password lama cusbooneysiin karo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
