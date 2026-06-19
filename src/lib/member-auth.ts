"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { firebasePublicConfig as firebaseConfig } from "@/lib/firebase-public-config";
import { isAdminEmail, isAdminLoginIdentifier } from "@/lib/auth";
import { ADMIN_EMAIL, ADMIN_FIREBASE_EMAIL, ADMIN_PASSWORD } from "@/lib/constants";
import {
  MEMBER_AUTH_DOMAIN,
  normalizeLoginId,
  loginIdToEmail,
  isValidMemberLoginId,
} from "@/lib/member-credentials";
import type { Member } from "@/types";

const SECONDARY_APP_NAME = "Secondary";

export {
  MEMBER_AUTH_DOMAIN,
  normalizeLoginId,
  loginIdToEmail,
  isValidMemberLoginId,
} from "@/lib/member-credentials";

/** Resolve what email to pass to signInWithEmailAndPassword. */
export function resolveFirebaseLoginEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();

  if (isAdminLoginIdentifier(trimmed)) {
    return ADMIN_FIREBASE_EMAIL.toLowerCase();
  }

  if (lower.endsWith(MEMBER_AUTH_DOMAIN)) {
    return lower;
  }

  const local = normalizeLoginId(trimmed);
  if (!local) return "";

  return `${local}${MEMBER_AUTH_DOMAIN}`;
}

export async function ensureAdminFirebaseAuthAccount(password: string): Promise<void> {
  const email = ADMIN_FIREBASE_EMAIL.toLowerCase();
  const secondaryAuth = getSecondaryAuth();

  try {
    await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code !== "auth/email-already-in-use") {
      throw error;
    }
  } finally {
    await signOut(secondaryAuth);
  }
}

export async function syncAdminPasswordFromServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/setup/admin-auth", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

function isRecoverableAuthError(code?: string): boolean {
  return (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  );
}

function adminLoginEmails(identifier: string): string[] {
  const lower = identifier.trim().toLowerCase();
  const emails = [ADMIN_FIREBASE_EMAIL.toLowerCase(), ADMIN_EMAIL.toLowerCase()];
  if (lower === ADMIN_EMAIL.toLowerCase()) {
    return [ADMIN_EMAIL.toLowerCase(), ADMIN_FIREBASE_EMAIL.toLowerCase()];
  }
  return emails;
}

/** Try all admin Firebase emails, bootstrap account, sync password, retry. */
export async function signInAdminWithFirebase(
  identifier: string,
  password: string
): Promise<UserCredential> {
  const trimmedPassword = password.trim();
  const emails = adminLoginEmails(identifier);
  let lastError: unknown;

  for (const email of emails) {
    try {
      return await signInWithEmailAndPassword(auth(), email, trimmedPassword);
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string })?.code;
      if (!isRecoverableAuthError(code)) {
        throw error;
      }
    }
  }

  if (trimmedPassword !== ADMIN_PASSWORD) {
    throw lastError;
  }

  await syncAdminPasswordFromServer();

  try {
    await ensureAdminFirebaseAuthAccount(trimmedPassword);
  } catch (bootstrapError) {
    const code = (bootstrapError as { code?: string })?.code;
    if (code !== "auth/email-already-in-use") {
      throw bootstrapError;
    }
  }

  await createAdminViaRestIfMissing();

  for (const email of emails) {
    try {
      return await signInWithEmailAndPassword(auth(), email, trimmedPassword);
    } catch (error) {
      lastError = error;
    }
  }

  const code = (lastError as { code?: string })?.code;
  if (isRecoverableAuthError(code)) {
    throw new Error(
      `${code}: Password-ka Firebase admin wuu ka duwan yahay. Firebase Console → Authentication → tirtir ` +
        `"admin@ac7group.app" ama "Ghaalabh10@gmail.com", kadib mar kale soo gal: admin / Hooyo114`
    );
  }

  throw lastError;
}

async function createAdminViaRestIfMissing(): Promise<void> {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) return;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ADMIN_FIREBASE_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        returnSecureToken: false,
      }),
    }
  );

  if (res.ok) return;

  const data = (await res.json()) as { error?: { message?: string } };
  const message = data.error?.message ?? "";
  if (message.includes("EMAIL_EXISTS")) return;
  if (message.includes("OPERATION_NOT_ALLOWED")) {
    throw new Error("auth/operation-not-allowed: Email/Password sign-in ma furan Firebase Console-ka");
  }
}

/** @deprecated Use loginIdToEmail */
export const memberAuthEmail = loginIdToEmail;

export function shouldUseFirebaseAuth(identifier: string, member?: Member): boolean {
  const trimmed = identifier.trim();
  if (isAdminEmail(trimmed)) return false;
  if (member?.password && !member.uid) return false;
  if (member?.uid) return true;
  if (trimmed.includes("@") && !trimmed.toLowerCase().endsWith(MEMBER_AUTH_DOMAIN)) return false;
  return true;
}

export function formatFirebaseAuthError(error: unknown): string {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: string; message?: string };
    if (code && message) return `${code}: ${message}`;
    if (code) return code;
    if (message) return message;
  }
  return String(error ?? "Unknown Firebase error");
}

function getSecondaryAuth() {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  const app = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(app);
}

export async function createMemberFirebaseAuth(_loginId: string, _password: string): Promise<string> {
  throw new Error(
    "Firebase Auth client-side lama abuuro — isticmaal Admin → Ku dar xubin (hal mar Auth + Firestore)"
  );
}
