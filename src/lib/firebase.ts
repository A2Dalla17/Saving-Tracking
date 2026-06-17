"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth as createAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebasePublicConfig as firebaseConfig } from "@/lib/firebase-public-config";

export { firebasePublicConfig, firebasePublicConfig as firebaseConfig } from "@/lib/firebase-public-config";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

function initFirebaseClient(): void {
  if (typeof window === "undefined") return;
  if (app) return;
  app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
  authInstance = createAuth(app);
  dbInstance = getFirestore(app);
}

/** Firebase Auth — browser only. */
export function getClientAuth(): Auth {
  initFirebaseClient();
  if (!authInstance) {
    throw new Error("Firebase Auth is only available in the browser");
  }
  return authInstance;
}

/** Primary Auth instance for sign-in (alias). */
export { getClientAuth as auth };

/** Firestore — browser only. */
export function getClientDb(): Firestore {
  initFirebaseClient();
  if (!dbInstance) {
    throw new Error("Firestore is only available in the browser");
  }
  return dbInstance;
}

/** Alias used across the app (import { db } from "@/lib/firebase"). */
export const db = getClientDb;
