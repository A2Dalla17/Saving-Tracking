#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error("Missing", filePath);
    process.exit(1);
  }
  const text = fs.readFileSync(filePath, "utf8");
  let parsed = 0;
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
    parsed++;
    console.log(`parsed key: ${key} (${val.length} chars raw)`);
  }
  console.log("total parsed:", parsed);
}

function normalizePrivateKey(privateKey) {
  let key = privateKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

loadEnvFile(envPath);

const keys = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const key of keys) {
  const val = process.env[key];
  console.log(`${key}: ${val ? `set (${val.length} chars)` : "MISSING"}`);
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

console.log("privateKey starts with BEGIN:", privateKeyRaw?.includes("BEGIN PRIVATE KEY") ?? false);

if (!clientEmail || !privateKeyRaw) {
  console.error("Admin env vars missing");
  process.exit(1);
}

const privateKey = normalizePrivateKey(privateKeyRaw);

try {
  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  const db = getFirestore();
  const snap = await db.collection("members").limit(3).get();
  console.log("Firestore OK — members docs:", snap.size);
  for (const doc of snap.docs) {
    console.log(" -", doc.id, doc.data().name);
  }
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
}
