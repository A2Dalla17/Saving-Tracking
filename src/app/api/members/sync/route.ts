import { NextResponse } from "next/server";
import { getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { listAllMembersUnified, syncAuthUsersToFirestore } from "@/lib/member-unified";

/** Admin: sync Firebase Auth users → Firestore members/{uid}. */
export async function POST() {
  try {
    const configError = getFirebaseAdminConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const sync = await syncAuthUsersToFirestore();
    const members = await listAllMembersUnified({ sync: false });

    return NextResponse.json({
      ok: true,
      sync,
      count: members.length,
      members,
    });
  } catch (err) {
    console.error("members/sync error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
