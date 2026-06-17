#!/usr/bin/env node
/**
 * Rewrite .env.local to canonical 3-line format (no secrets printed).
 * Fixes: multiline keys, trailing commas, CRLF, missing quotes.
 */
import fs from "fs";
import { getEnvLocalPath, parseEnvFile, normalizePrivateKey } from "./load-env.mjs";

const envPath = getEnvLocalPath();
if (!fs.existsSync(envPath)) {
  console.error("✗ .env.local not found");
  process.exit(1);
}

const text = fs.readFileSync(envPath, "utf8");
const env = parseEnvFile(text);

const projectId = env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim() || "";
const privateKey = env.FIREBASE_PRIVATE_KEY?.trim() || "";

if (!clientEmail) {
  console.error("✗ FIREBASE_CLIENT_EMAIL missing in .env.local");
  process.exit(1);
}
if (!privateKey || !normalizePrivateKey(privateKey).includes("BEGIN PRIVATE KEY")) {
  console.error("✗ FIREBASE_PRIVATE_KEY missing or invalid PEM markers");
  process.exit(1);
}

// Store as literal \n on one line (what Next.js + our loader expect)
const pemOneLine = normalizePrivateKey(privateKey).replace(/\n/g, "\\n");

const out = [
  `FIREBASE_PROJECT_ID=${projectId}`,
  `FIREBASE_CLIENT_EMAIL=${clientEmail}`,
  ...(env.FIRESTORE_DATABASE_ID?.trim()
    ? [`FIRESTORE_DATABASE_ID=${env.FIRESTORE_DATABASE_ID.trim()}`]
    : []),
  `FIREBASE_PRIVATE_KEY="${pemOneLine}"`,
  "",
].join("\n");

fs.writeFileSync(envPath, out, "utf8");
console.log("✓ .env.local normalized (3 lines, LF, quoted PEM with \\n)");
console.log("  path:", envPath);
console.log("  bytes:", Buffer.byteLength(out, "utf8"));
