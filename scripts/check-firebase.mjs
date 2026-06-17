#!/usr/bin/env node
/**
 * Hubi Firebase admin env vars + test Firestore connection
 * Run: npm run firebase:status
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("✗ .env.local — file not found (copy from .env.local.example)");
    return;
  }
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val.replace(/\\n/g, "\n");
  }
}

function normalizePrivateKey(privateKey) {
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

loadEnvFile(envPath);

console.log("\nAC7 Keydka — Firebase Admin Check\n");

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

console.log(`· FIREBASE_PROJECT_ID — ${projectId}`);
console.log(clientEmail ? `✓ FIREBASE_CLIENT_EMAIL — set` : `✗ FIREBASE_CLIENT_EMAIL — empty or missing`);
const keyOk = privateKeyRaw && normalizePrivateKey(privateKeyRaw).includes("BEGIN PRIVATE KEY");
console.log(keyOk ? `✓ FIREBASE_PRIVATE_KEY — valid PEM` : `✗ FIREBASE_PRIVATE_KEY — empty or invalid`);

if (!clientEmail || !keyOk) {
  console.log("\n→ Fix: open .env.local, paste your service account email + private key, SAVE (Ctrl+S), then restart: npm run dev:win\n");
  process.exit(1);
}

try {
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKeyRaw),
      }),
    });
  }
  const snap = await getFirestore().collection("members").limit(1).get();
  console.log(`\n→ Firestore connection OK (members sample: ${snap.size} doc(s))\n`);
} catch (err) {
  console.error("\n→ Firestore connection FAILED:", err.message);
  console.log("→ Check private key format: one line in quotes with \\n between lines\n");
  process.exit(1);
}
