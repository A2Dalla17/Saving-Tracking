"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";
import { ADMIN_FIREBASE_EMAIL, ADMIN_FIREBASE_PASSWORD } from "@/lib/constants";
import { formatFirebaseAuthError } from "@/lib/member-auth";

let signInPromise: Promise<void> | null = null;

export function isAdminFirebaseUser(): boolean {
  if (typeof window === "undefined") return false;
  return getClientAuth().currentUser?.email?.toLowerCase() === ADMIN_FIREBASE_EMAIL.toLowerCase();
}

/** Sign in admin@ac7group.app so Firestore security rules allow writes. */
export async function ensureAdminFirebaseSession(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Firebase Auth waa browser kaliya" };
  }

  if (isAdminFirebaseUser()) {
    return { success: true };
  }

  if (signInPromise) {
    try {
      await signInPromise;
      return isAdminFirebaseUser()
        ? { success: true }
        : { success: false, error: "Admin Firebase session lama xaqiijin karo" };
    } catch (error) {
      return { success: false, error: formatFirebaseAuthError(error) };
    }
  }

  signInPromise = signInWithEmailAndPassword(
    getClientAuth(),
    ADMIN_FIREBASE_EMAIL,
    ADMIN_FIREBASE_PASSWORD
  ).then(() => undefined);

  try {
    await signInPromise;
    return { success: true };
  } catch (error) {
    return { success: false, error: formatFirebaseAuthError(error) };
  } finally {
    signInPromise = null;
  }
}

/** Sign out only the admin Firebase account (leave member sessions untouched). */
export async function clearAdminFirebaseSession(): Promise<void> {
  if (typeof window === "undefined" || !isAdminFirebaseUser()) return;
  try {
    await signOut(getClientAuth());
  } catch {
    // ignore if already signed out
  }
}
