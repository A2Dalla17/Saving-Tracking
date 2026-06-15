#!/usr/bin/env node
/**
 * Hubi env vars Firebase — local ama CI
 * Run: npm run firebase:status
 */

const requiredPublic = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredPublic.filter((k) => !process.env[k] || process.env[k] === "your-api-key");
const hasAdmin = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

console.log("\nAC7 Keydka — Firebase Config Check\n");

if (missing.length === 0) {
  console.log("✓ Client Firebase vars (NEXT_PUBLIC_FIREBASE_*) — OK");
} else {
  console.log("✗ Missing client vars:", missing.join(", "));
}

if (hasAdmin) {
  try {
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log("✓ FIREBASE_SERVICE_ACCOUNT_JSON — OK (valid JSON)");
  } catch {
    console.log("✗ FIREBASE_SERVICE_ACCOUNT_JSON — invalid JSON");
  }
} else {
  console.log("✗ FIREBASE_SERVICE_ACCOUNT_JSON — missing (login API won't work)");
}

if (missing.length === 0 && hasAdmin) {
  console.log("\n→ Mode: firebase (cloud) — dhammaan browser-yadu hal xog arki doonaan\n");
  process.exit(0);
}

console.log("\n→ Mode: demo (localStorage) — browser kasta xog u gaar ah\n");
console.log("Akhri FIREBASE_VERCEL_SETUP.md si aad u habeyso Vercel + Firebase.\n");
process.exit(missing.length > 0 || !hasAdmin ? 1 : 0);
