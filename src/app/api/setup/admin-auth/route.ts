import { NextResponse } from "next/server";

import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

import { FIREBASE_API_KEY } from "@/lib/firebase-public-config";

import { ADMIN_FIREBASE_EMAIL, ADMIN_FIREBASE_PASSWORD } from "@/lib/constants";



async function createAdminViaRest(): Promise<{ created: boolean; exists: boolean }> {

  const apiKey = FIREBASE_API_KEY;

  if (!apiKey) {

    throw new Error("Firebase API key ma jirto");

  }



  const res = await fetch(

    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,

    {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        email: ADMIN_FIREBASE_EMAIL.toLowerCase(),

        password: ADMIN_FIREBASE_PASSWORD,

        returnSecureToken: false,

      }),

    }

  );



  if (res.ok) {

    return { created: true, exists: false };

  }



  const data = (await res.json()) as { error?: { message?: string } };

  const message = data.error?.message ?? "";

  if (message.includes("EMAIL_EXISTS")) {

    return { created: false, exists: true };

  }



  throw new Error(message || "REST signUp failed");

}



/** Ensures admin@ac7group.app exists in Firebase Auth for client-side Firestore writes. */

export async function POST() {

  const auth = getFirebaseAdminAuth();



  if (auth) {

    try {

      let created = false;

      let updated = false;



      try {

        const existing = await auth.getUserByEmail(ADMIN_FIREBASE_EMAIL);

        await auth.updateUser(existing.uid, {

          password: ADMIN_FIREBASE_PASSWORD,

          emailVerified: true,

          displayName: "Maamulaha",

        });

        updated = true;

      } catch {

        await auth.createUser({

          email: ADMIN_FIREBASE_EMAIL,

          password: ADMIN_FIREBASE_PASSWORD,

          emailVerified: true,

          displayName: "Maamulaha",

        });

        created = true;

      }



      return NextResponse.json({ ok: true, created, updated, email: ADMIN_FIREBASE_EMAIL });

    } catch (err) {

      console.error("admin auth setup error", err);

      return NextResponse.json({ error: "Admin Auth user lama abuuri karo" }, { status: 500 });

    }

  }



  try {

    const result = await createAdminViaRest();

    return NextResponse.json({

      ok: true,

      created: result.created,

      exists: result.exists,

      email: ADMIN_FIREBASE_EMAIL,

      method: "rest",

    });

  } catch (err) {

    console.error("admin auth REST setup error", err);

    return NextResponse.json(

      { error: "Admin Auth user lama abuuri karo (REST)" },

      { status: 500 }

    );

  }

}


