import { NextRequest, NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";

const globalStore = globalThis as typeof globalThis & {
  recoveryStore?: { code: string; expiresAt: number };
};

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const input = String(code ?? "").trim();

  const db = getFirestoreAdmin();
  let stored: { code: string; expiresAt: number } | null = null;

  if (db) {
    const docSnap = await db.collection("recovery_codes").doc("current").get();
    if (docSnap.exists) {
      const data = docSnap.data();
      stored = { code: data?.code as string, expiresAt: Number(data?.expires_at) };
    }
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
    await db.collection("recovery_codes").doc("current").delete();
  } else {
    globalStore.recoveryStore = undefined;
  }

  return NextResponse.json({ success: true });
}
