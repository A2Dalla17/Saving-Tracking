#!/usr/bin/env node
/**
 * Ensure default Firestore database exists (fixes Admin SDK NOT_FOUND).
 * Uses service account from .env.local — no firebase login required.
 */
import { loadEnvLocal, normalizePrivateKey } from "./load-env.mjs";

loadEnvLocal();

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

if (!clientEmail || !privateKeyRaw) {
  console.error("✗ Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const { JWT } = await import("google-auth-library");

const jwt = new JWT({
  email: clientEmail,
  key: normalizePrivateKey(privateKeyRaw),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function listDatabases() {
  const token = await jwt.getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message ?? `list databases HTTP ${res.status}`);
  }
  return body.databases ?? [];
}

async function createDatabase(locationId = "eur3") {
  const token = await jwt.getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=(default)`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locationId,
      type: "FIRESTORE_NATIVE",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message ?? `create database HTTP ${res.status}`);
  }
  return body;
}

console.log("\nEnsuring Firestore database for project:", projectId);

try {
  const databases = await listDatabases();
  const defaultDb = databases.find((d) => d.name?.endsWith("/databases/(default)"));
  if (defaultDb) {
    console.log("✓ Default Firestore database already exists");
    console.log("  state:", defaultDb.createTime ? "ready" : defaultDb.type ?? "unknown");
    process.exit(0);
  }

  console.log("· No default database — creating (location: eur3)...");
  const op = await createDatabase("eur3");
  console.log("✓ Create operation started:", op.name ?? "ok");
  console.log("  (may take 1–2 minutes to become ready — re-run npm run firebase:status)");
} catch (err) {
  console.error("✗ Firestore setup failed:", err.message ?? err);
  console.log("\nManual fix: Firebase Console → Build → Firestore Database → Create database");
  process.exit(1);
}
