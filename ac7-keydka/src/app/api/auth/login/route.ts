import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { findMemberByIdentifier, validateMemberLogin, toAuthUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 503 });
  }

  const body = await request.json();
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Email iyo password waa lagama maarmaan" }, { status: 400 });
  }

  const member = await findMemberByIdentifier(identifier);
  if (!member) {
    return NextResponse.json({ error: "Login ID lama helin" }, { status: 401 });
  }

  const loginError = validateMemberLogin(member, password);
  if (loginError) {
    return NextResponse.json({ error: loginError }, { status: 401 });
  }

  const user = toAuthUser(member);
  const token = await adminAuth.createCustomToken(member.id, {
    admin: user.isAdmin,
    memberId: member.id,
  });

  return NextResponse.json({ token, user });
}
