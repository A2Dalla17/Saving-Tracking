import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";

const globalStore = globalThis as typeof globalThis & {
  recoveryStore?: { code: string; expiresAt: number };
};

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const input = String(code ?? "").trim();

  const db = getAdminDb();
  let stored: { code: string; expiresAt: number } | null = null;

  if (db) {
    const doc = await db.collection(COLLECTIONS.SETTINGS).doc("recovery").get();
    if (doc.exists) stored = doc.data() as { code: string; expiresAt: number };
  } else {
    stored = globalStore.recoveryStore ?? null;
  }

  if (!stored || Date.now() > stored.expiresAt) {
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }

  if (input !== stored.code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  if (db) {
    await db.collection(COLLECTIONS.SETTINGS).doc("recovery").delete();
  } else {
    globalStore.recoveryStore = undefined;
  }

  return NextResponse.json({ success: true });
}
