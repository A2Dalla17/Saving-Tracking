import { NextResponse } from "next/server";
import { ADMIN_EMAIL, COLLECTIONS, RECOVERY_CODE_EXPIRY_MS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const globalStore = globalThis as typeof globalThis & {
  recoveryStore?: { code: string; expiresAt: number };
};

export async function POST() {
  const code = generateCode();
  const expiresAt = Date.now() + RECOVERY_CODE_EXPIRY_MS;

  const db = getAdminDb();
  if (db) {
    await db.collection(COLLECTIONS.SETTINGS).doc("recovery").set({ code, expiresAt });
  } else {
    globalStore.recoveryStore = { code, expiresAt };
  }

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (smtpConfigured) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: ADMIN_EMAIL,
        subject: "AC7 Group — Recovery Code",
        text: `Your AC7 admin recovery code is: ${code}\n\nThis code expires in 15 minutes.`,
      });
    } catch {
      return NextResponse.json(
        { message: "Email sending failed. Contact admin." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    message: smtpConfigured
      ? `Code waa loo diray ${ADMIN_EMAIL}`
      : `Code waa loo diyaariyay. Hubi ${ADMIN_EMAIL} (SMTP ma configured).`,
    sent: true,
    ...(process.env.NODE_ENV === "development" && !smtpConfigured ? { demoCode: code } : {}),
  });
}
