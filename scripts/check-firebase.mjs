#!/usr/bin/env node
/**
 * Hubi Firebase admin env vars + test Firestore connection
 * Run: npm run firebase:status
 */
import {
  loadEnvLocal,
  normalizePrivateKey,
  isPrivateKeyValid,
} from "./load-env.mjs";

// Normalize .env.local format before loading (fixes multiline / CRLF / commas)
try {
  const { execSync } = await import("child_process");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const script = join(dirname(fileURLToPath(import.meta.url)), "normalize-env-local.mjs");
  execSync(`node "${script}"`, { stdio: "pipe" });
} catch {
  // normalize failed — continue with raw file
}

const { envPath, exists, bytes } = loadEnvLocal();

console.log("\nAC7 Keydka — Firebase Admin Check\n");
console.log(`· .env.local path — ${envPath}`);
console.log(`· .env.local exists — ${exists ? "yes" : "no"}`);
if (exists) {
  console.log(`· .env.local size — ${bytes} bytes`);
  if (bytes < 400) {
    console.log("⚠ File is very small — save .env.local to disk (Ctrl+S), not just the editor buffer");
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

const projectOk = Boolean(projectId);
const emailOk = Boolean(clientEmail);
const keyOk = isPrivateKeyValid(privateKeyRaw);

console.log(projectOk ? `✓ FIREBASE_PROJECT_ID — ${projectId}` : `✗ FIREBASE_PROJECT_ID — empty or missing`);
console.log(emailOk ? `✓ FIREBASE_CLIENT_EMAIL — set` : `✗ FIREBASE_CLIENT_EMAIL — empty or missing`);
console.log(keyOk ? `✓ FIREBASE_PRIVATE_KEY — valid PEM` : `✗ FIREBASE_PRIVATE_KEY — empty or invalid`);

if (!projectOk || !emailOk || !keyOk) {
  console.log("\n→ Fix .env.local (project root), SAVE (Ctrl+S), then re-run: npm run firebase:status");
  console.log('  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.log("  (one physical line, double quotes, literal \\n)\n");
  process.exit(1);
}

let adminReady = false;
try {
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || "default";
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: normalizePrivateKey(privateKeyRaw),
        }),
      });
  const db = getFirestore(app, databaseId);
  const snap = await db.collection("members").limit(1).get();
  console.log(`✓ Firestore connection — OK (database: ${databaseId}, members sample: ${snap.size} doc(s))`);
  console.log("\n→ All checks passed.\n");
  adminReady = true;
} catch (err) {
  const msg = err?.message ?? String(err);
  console.log(`✗ Firestore connection — FAILED (${msg.trim() || "unknown"})`);

  if (msg.includes("NOT_FOUND")) {
    console.log("\n→ Root cause: No Firestore database in project ac7-group yet.");
    console.log("  1. Open https://console.firebase.google.com/project/ac7-group/firestore");
    console.log("  2. Click Create database → Start in production mode → pick a region → Enable");
    console.log("  3. Firestore → Rules → publish: allow read, write: if request.auth != null;");
    console.log("  4. Re-run: npm run firebase:status\n");
  } else {
    console.log("\n→ Admin credentials loaded but Firestore rejected the request.");
    console.log("  Re-download the service account JSON from Firebase Console → Project settings → Service accounts.\n");
  }
  process.exit(1);
}

if (!adminReady) process.exit(1);
