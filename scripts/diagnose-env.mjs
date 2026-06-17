#!/usr/bin/env node
/** Safe .env.local diagnostics — never prints secret values. */
import { loadEnvLocal, isPrivateKeyValid, normalizePrivateKey } from "./load-env.mjs";

const { envPath, exists, bytes, env } = loadEnvLocal();

console.log("Env diagnostic (no secrets printed)\n");
console.log("· path:", envPath);
console.log("· exists:", exists);
console.log("· file bytes:", bytes);

const email = env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
const keyRaw = env.FIREBASE_PRIVATE_KEY?.trim() ?? "";

console.log("\nFIREBASE_PROJECT_ID:", env.FIREBASE_PROJECT_ID ? "set" : "missing");
console.log("FIREBASE_CLIENT_EMAIL:", email ? `set (${email.length} chars)` : "missing/empty");

if (!keyRaw) {
  console.log("FIREBASE_PRIVATE_KEY: missing/empty");
} else {
  const normalized = normalizePrivateKey(keyRaw);
  console.log("FIREBASE_PRIVATE_KEY length:", keyRaw.length);
  console.log("  valid PEM markers:", isPrivateKeyValid(keyRaw));
  console.log("  normalized line count:", normalized.split("\n").length);
  console.log("  still has literal \\n:", keyRaw.includes("\\n"));
  console.log("  trailing comma on raw value:", /,\s*$/.test(keyRaw));
}

if (exists && bytes < 400) {
  console.log("\n⚠ .env.local is unusually small — editor may show values that are not saved to disk.");
}
