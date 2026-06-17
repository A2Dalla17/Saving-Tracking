import { NextResponse } from "next/server";
import { getFirestoreAdmin, getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { rowToMember } from "@/lib/firestore-mappers";

/** Admin: list all members from Firestore (Admin SDK — bypasses client rules). */
export async function GET() {
  try {
    const db = getFirestoreAdmin();
    if (!db) {
      return NextResponse.json(
        { error: getFirebaseAdminConfigError() ?? "Firebase Admin ma diyaar ahayn" },
        { status: 503 }
      );
    }

    const snapshot = await db.collection("members").get();
    const members = snapshot.docs
      .map((doc) => rowToMember({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      ok: true,
      count: members.length,
      members,
    });
  } catch (err) {
    console.error("members/list FAILED — full error:", err);
    if (err instanceof Error && err.stack) {
      console.error("members/list stack:", err.stack);
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
