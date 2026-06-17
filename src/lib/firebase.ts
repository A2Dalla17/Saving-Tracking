"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth as createAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  waitForPendingWrites,
  type Firestore,
} from "firebase/firestore";
import { firebasePublicConfig as firebaseConfig, firestoreDatabaseId } from "@/lib/firebase-public-config";

export { firebasePublicConfig, firebasePublicConfig as firebaseConfig } from "@/lib/firebase-public-config";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let networkReady: Promise<void> | undefined;

const FIRESTORE_SETTINGS = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
  experimentalForceLongPolling: true,
} as const;

const FIRESTORE_DATABASE_ID = firestoreDatabaseId;

function initFirebaseClient(): void {
  if (typeof window === "undefined") return;

  if (!app) {
    app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
    authInstance = createAuth(app);
  }

  if (!dbInstance) {
    try {
      dbInstance = initializeFirestore(app, FIRESTORE_SETTINGS, FIRESTORE_DATABASE_ID);
    } catch {
      // Hot reload — reuse instance created earlier in this session.
      dbInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
    }
    networkReady = enableNetwork(dbInstance)
      .then(() => {
        console.log("Firebase Firestore online:", firebaseConfig.projectId, "db:", FIRESTORE_DATABASE_ID);
      })
      .catch((err) => {
        console.warn("Firestore enableNetwork warning:", err);
      });
  }
}

/** Ensure Firestore network transport is active before server reads/writes. */
export async function ensureFirestoreOnline(): Promise<void> {
  initFirebaseClient();
  if (!dbInstance) {
    throw new Error("Firestore is only available in the browser");
  }
  if (networkReady) {
    await networkReady;
  }
  try {
    await enableNetwork(dbInstance);
  } catch (err) {
    console.warn("ensureFirestoreOnline:", err);
  }
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
