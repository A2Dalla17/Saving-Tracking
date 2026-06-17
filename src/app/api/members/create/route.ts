import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { getFirebaseAdminAuth, getFirestoreAdmin, getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import {
  isValidMemberLoginId,
  loginIdToEmail,
  normalizeLoginId,
} from "@/lib/member-credentials";

export interface CreateMemberBody {
  name: string;
  loginId: string;
  password: string;
  contribution: number;
}

/** Admin: create Firebase Auth user + Firestore members/{uid} in one step. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateMemberBody;
    const name = body.name?.trim();
    const loginId = normalizeLoginId(body.loginId ?? "");
    const password = body.password ?? "";
    const contribution = Number(body.contribution);

    if (!name) {
      return NextResponse.json({ error: "Magaca xubinta waa lagama maarmaan" }, { status: 400 });
    }
    if (!isValidMemberLoginId(loginId)) {
      return NextResponse.json({ error: "Login ID aan sax ahayn" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password waa inuu ugu yaraan 6 xaraf yahay" }, { status: 400 });
    }
    if (!Number.isFinite(contribution) || contribution <= 0) {
      return NextResponse.json({ error: "Lacagta bishii waa inay ka weyn tahay 0" }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const db = getFirestoreAdmin();
    if (!auth || !db) {
      const message = getFirebaseAdminConfigError() ?? "Firebase Admin ma diyaar ahayn";
      console.error("members/create:", message);
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const email = loginIdToEmail(loginId);
    const createdAt = new Date().toISOString();
    const joinDate = DEFAULT_SETTINGS.groupStartDate;

    let uid: string;
    try {
      const user = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
      uid = user.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
      } else {
        throw err;
      }
    }

    const memberDoc = {
      name,
      loginId,
      contributionAmount: contribution,
      paid: false,
      createdAt,
      uid,
      email,
      join_date: joinDate,
      monthly_fee: contribution,
      annual_target: contribution * 12,
      login_active: true,
      status: "active",
    };

    await db.collection("members").doc(uid).set(memberDoc, { merge: true });
    console.log("members/create: Firestore write OK", { uid, loginId });

    return NextResponse.json({
      ok: true,
      id: uid,
      uid,
      email,
      loginId,
    });
  } catch (err) {
    console.error("members/create error:", err);
    const message = err instanceof Error ? err.message : "Xubin lama abuuri karo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
