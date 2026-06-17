#!/usr/bin/env node
/**
 * Hubi Firebase admin env vars
 * Run: npm run firebase:status
 */
const required = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const optional = ["FIREBASE_PROJECT_ID"];

console.log("\nAC7 Keydka — Firebase Config Check\n");

let ok = true;
for (const key of required) {
  if (process.env[key]) {
    console.log(`✓ ${key} — OK`);
  } else {
    console.log(`✗ ${key} — missing`);
    ok = false;
  }
}

for (const key of optional) {
  if (process.env[key]) {
    console.log(`✓ ${key} — OK`);
  } else {
    console.log(`· ${key} — optional (defaults to ac7-group)`);
  }
}

console.log("\n→ Client Firebase config: embedded in src/lib/firebase.js");
console.log(ok ? "\n→ Mode: firebase (cloud)\n" : "\n→ Server admin missing — login API falls back to local demo\n");
