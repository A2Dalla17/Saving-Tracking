import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Public Firebase project id — not a secret; override with FIREBASE_PROJECT_ID. */
const DEFAULT_PROJECT_ID = "ac7-group";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim()
  );
}

/** Env vars store PEM newlines as literal \n — convert to real line breaks. */
function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

let adminDb: Firestore | undefined;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  if (isFirebaseAdminConfigured()) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.trim(),
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!.trim()),
      }),
    });
  }

  return initializeApp({ projectId: DEFAULT_PROJECT_ID });
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
