import { NextRequest, NextResponse } from "next/server";

import { findMemberByIdentifier, validateMemberLogin, toAuthUser } from "@/lib/server-auth";

import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";



export async function POST(request: NextRequest) {

  if (!isFirebaseAdminConfigured()) {

    return NextResponse.json({ error: "Server database not configured" }, { status: 503 });

  }



  const body = await request.json();

  const identifier = String(body.identifier ?? "").trim();

  const password = String(body.password ?? "");



  if (!identifier || !password) {

    return NextResponse.json({ error: "Login ID iyo password waa lagama maarmaan" }, { status: 400 });

  }



  const member = await findMemberByIdentifier(identifier);

  if (!member) {

    return NextResponse.json({ error: "Login ID lama helin" }, { status: 401 });

  }



  const loginError = validateMemberLogin(member, password);

  if (loginError) {

    return NextResponse.json({ error: loginError }, { status: 401 });

  }



  return NextResponse.json({ user: toAuthUser(member) });

}

