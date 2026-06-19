import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { createMemberUnified } from "@/lib/member-unified";

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
    const configError = getFirebaseAdminConfigError();
    if (configError) {
      return NextResponse.json({ error: configError, stage: "admin-config" }, { status: 503 });
    }

    const body = (await request.json()) as CreateMemberBody;
    const result = await createMemberUnified({
      name: body.name ?? "",
      loginId: body.loginId ?? "",
      password: body.password ?? "",
      contribution: Number(body.contribution),
    });

    return NextResponse.json({
      ok: true,
      success: true,
      id: result.uid,
      uid: result.uid,
      email: result.email,
      loginId: result.loginId,
      created: result.created,
      message: result.created
        ? "Xubinta Auth + Firestore waa la kaydiyay"
        : "Xubinta horey ayaa jirtay — waa la cusbooneysiiyay",
    });
  } catch (err) {
    console.error("members/create error:", err);
    const message = formatError(err);
    const notFound = message.includes("NOT_FOUND");
    return NextResponse.json(
      {
        error: notFound
          ? "Firestore database lama helin — Firebase Console → Firestore → Create database (project ac7-group)"
          : message,
        stage: notFound ? "firestore-write" : "create",
      },
      { status: notFound ? 503 : 500 }
    );
  }
}
