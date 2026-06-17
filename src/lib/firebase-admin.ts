import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Public Firebase project id — not a secret; override with FIREBASE_PROJECT_ID. */
const DEFAULT_PROJECT_ID = "ac7-group";

/**
 * Firestore database id in this project (NOT "(default)" — Console created "default").
 * Override with FIRESTORE_DATABASE_ID in .env.local if needed.
 */
export const FIRESTORE_DATABASE_ID =
  (typeof process !== "undefined" ? process.env.FIRESTORE_DATABASE_ID?.trim() : undefined) ||
  "default";

/**
 * Env vars store PEM newlines as literal "\\n" — convert to real line breaks.
 * Also strips wrapping quotes from .env values.
 */
export function normalizePrivateKey(privateKey: string): string {
  let key = privateKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  // Strip accidental trailing comma from .env (e.g. `"...\n",`)
  key = key.replace(/,\s*$/, "");
  return key.replace(/\\n/g, "\n");
}

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function getFirebaseAdminMissingVars(): string[] {
  const missing: string[] = [];
  if (!readEnv("FIREBASE_CLIENT_EMAIL")) missing.push("FIREBASE_CLIENT_EMAIL");
  const key = readEnv("FIREBASE_PRIVATE_KEY");
  if (!key || !normalizePrivateKey(key).includes("BEGIN PRIVATE KEY")) {
    missing.push("FIREBASE_PRIVATE_KEY");
  }
  return missing;
}

export function isFirebaseAdminConfigured(): boolean {
  return getFirebaseAdminMissingVars().length === 0;
}

export function getFirebaseAdminConfigError(): string | null {
  const missing = getFirebaseAdminMissingVars();
  if (missing.length === 0) return null;
  return `Firebase Admin ma diyaar ahayn — buuxi .env.local: ${missing.join(", ")}. Kadib dib u bilow dev server (npm run dev:win).`;
}

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let initError: Error | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const missing = getFirebaseAdminMissingVars();
  if (missing.length > 0) {
    const err = new Error(getFirebaseAdminConfigError() ?? `Missing: ${missing.join(", ")}`);
    initError = err;
    console.error("[firebase-admin] Configuration missing:", missing.join(", "));
    throw err;
  }

  const projectId = readEnv("FIREBASE_PROJECT_ID") || DEFAULT_PROJECT_ID;
  const clientEmail = readEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(readEnv("FIREBASE_PRIVATE_KEY"));

  try {
    console.log("[firebase-admin] Initializing Admin SDK for project:", projectId);
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("[firebase-admin] Admin SDK initialized OK");
    return adminApp;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[firebase-admin] INIT FAILED — full error:", err);
    if (err instanceof Error && err.stack) {
      console.error("[firebase-admin] stack:", err.stack);
    }
    throw initError;
  }
}

export function getFirebaseAdminInitError(): Error | undefined {
  return initError;
}

export function getFirestoreAdmin(): Firestore | null {
  if (!isFirebaseAdminConfigured()) {
    console.error("[firebase-admin] getFirestoreAdmin: not configured —", getFirebaseAdminMissingVars());
    return null;
  }
  try {
    if (!adminDb) {
      adminDb = getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
      console.log("[firebase-admin] Firestore database:", FIRESTORE_DATABASE_ID);
    }
    return adminDb;
  } catch (err) {
    console.error("[firebase-admin] getFirestoreAdmin FAILED — full error:", err);
    if (err instanceof Error && err.stack) {
      console.error("[firebase-admin] stack:", err.stack);
    }
    return null;
  }
}

export function getFirebaseAdminAuth(): Auth | null {
  if (!isFirebaseAdminConfigured()) {
    console.error("[firebase-admin] getFirebaseAdminAuth: not configured —", getFirebaseAdminMissingVars());
    return null;
  }
  try {
    return getAuth(getAdminApp());
  } catch (err) {
    console.error("[firebase-admin] getFirebaseAdminAuth FAILED — full error:", err);
    if (err instanceof Error && err.stack) {
      console.error("[firebase-admin] stack:", err.stack);
    }
    return null;
  }
}
