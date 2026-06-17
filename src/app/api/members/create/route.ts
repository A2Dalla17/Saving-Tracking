import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  getFirebaseAdminAuth,
  getFirestoreAdmin,
  getFirebaseAdminConfigError,
  getFirebaseAdminInitError,
} from "@/lib/firebase-admin";
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

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
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

    // --- Admin SDK init (with full error logging) ---
    let auth;
    let db;
    try {
      auth = getFirebaseAdminAuth();
      db = getFirestoreAdmin();
    } catch (initErr) {
      console.error("members/create: Admin SDK init threw:", initErr);
      const message =
        formatError(initErr) ||
        getFirebaseAdminConfigError() ||
        "Firebase Admin initialization failed";
      return NextResponse.json({ error: message, stage: "admin-init" }, { status: 503 });
    }

    if (!auth || !db) {
      const message =
        getFirebaseAdminConfigError() ||
        formatError(getFirebaseAdminInitError()) ||
        "Firebase Admin ma diyaar ahayn";
      console.error("members/create: Admin SDK unavailable:", message);
      return NextResponse.json({ error: message, stage: "admin-config" }, { status: 503 });
    }

    const email = loginIdToEmail(loginId);
    const createdAt = new Date().toISOString();
    const joinDate = DEFAULT_SETTINGS.groupStartDate;

    // --- Firebase Auth user ---
    let uid: string;
    try {
      const user = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
      uid = user.uid;
      console.log("members/create: Auth user created", { uid, email });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        console.log("members/create: Auth user already exists, reusing uid", uid);
      } else {
        console.error("members/create: Auth createUser FAILED — full error:", err);
        return NextResponse.json(
          { error: `Auth user lama abuuri karo: ${formatError(err)}`, stage: "auth-create" },
          { status: 500 }
        );
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

    // --- Firestore write (with full error logging) ---
    try {
      await db.collection("members").doc(uid).set(memberDoc, { merge: true });
      const verify = await db.collection("members").doc(uid).get();
      if (!verify.exists) {
        throw new Error("Firestore document not found after write");
      }
      console.log("members/create: Firestore write OK", { uid, loginId, path: `members/${uid}` });
    } catch (firestoreErr) {
      console.error("members/create: Firestore write FAILED — full error:", firestoreErr);
      if (firestoreErr instanceof Error && firestoreErr.stack) {
        console.error("members/create: Firestore stack:", firestoreErr.stack);
      }
      const errText = formatError(firestoreErr);
      const notFound = errText.includes("NOT_FOUND");
      return NextResponse.json(
        {
          error: notFound
            ? "Firestore database lama helin — Firebase Console → Firestore → Create database (project ac7-group)"
            : `Firestore kaydin wuu fashilmay: ${errText}`,
          stage: "firestore-write",
          uid,
        },
        { status: notFound ? 503 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      id: uid,
      uid,
      email,
      loginId,
      message: "Xubinta Auth + Firestore waa la kaydiyay",
    });
  } catch (err) {
    console.error("members/create: unexpected error — full error:", err);
    if (err instanceof Error && err.stack) {
      console.error("members/create: stack:", err.stack);
    }
    const message = formatError(err);
    return NextResponse.json({ error: message, stage: "unknown" }, { status: 500 });
  }
}
