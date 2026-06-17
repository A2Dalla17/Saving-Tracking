import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Public Firebase project id — not a secret; override with FIREBASE_PROJECT_ID. */
const DEFAULT_PROJECT_ID = "ac7-group";

/** Env vars store PEM newlines as literal \n — convert to real line breaks. */
export function normalizePrivateKey(privateKey: string): string {
  let key = privateKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  return key;
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

let adminDb: Firestore | undefined;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  if (!isFirebaseAdminConfigured()) {
    throw new Error(getFirebaseAdminConfigError() ?? "Firebase Admin ma diyaar ahayn");
  }

  const privateKey = normalizePrivateKey(readEnv("FIREBASE_PRIVATE_KEY"));

  return initializeApp({
    credential: cert({
      projectId: readEnv("FIREBASE_PROJECT_ID") || DEFAULT_PROJECT_ID,
      clientEmail: readEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey,
    }),
  });
}

export function getFirestoreAdmin(): Firestore | null {
  if (!isFirebaseAdminConfigured()) return null;
  if (!adminDb) adminDb = getFirestore(getAdminApp());
  return adminDb;
}

export function getFirebaseAdminAuth(): Auth | null {
  if (!isFirebaseAdminConfigured()) return null;
  return getAuth(getAdminApp());
}
