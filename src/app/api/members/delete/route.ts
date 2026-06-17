import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

/** Admin: disable deleted member Firebase Auth login after archive to bin. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { uid?: string; email?: string };
    const uid = body.uid?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!uid && !email) {
      return NextResponse.json({ error: "UID ama email waa lagama maarmaan" }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Firebase Admin ma diyaar ahayn" },
        { status: 503 }
      );
    }

    let targetUid = uid;
    if (!targetUid && email) {
      const existing = await auth.getUserByEmail(email);
      targetUid = existing.uid;
    }

    if (!targetUid) {
      return NextResponse.json({ error: "Isticmaalaha lama helin" }, { status: 404 });
    }

    await auth.deleteUser(targetUid);

    return NextResponse.json({ ok: true, uid: targetUid });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      return NextResponse.json({ ok: true, skipped: true });
    }
    console.error("members/delete error:", err);
    const message = err instanceof Error ? err.message : "Isticmaalaha lama tirtiri karo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
