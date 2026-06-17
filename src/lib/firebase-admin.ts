import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID = "ac7-group";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

let adminDb: Firestore | undefined;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  if (isFirebaseAdminConfigured()) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  return initializeApp({ projectId: PROJECT_ID });
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
