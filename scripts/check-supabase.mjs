#!/usr/bin/env node
/**
 * Hubi Supabase env vars
 * Run: npm run supabase:status
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const missing = required.filter((k) => !process.env[k] || process.env[k]?.includes("your-"));
const hasAdmin = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log("\nAC7 Keydka — Supabase Config Check\n");

if (missing.length === 0) {
  console.log("✓ Client Supabase vars — OK");
} else {
  console.log("✗ Missing:", missing.join(", "));
}

if (hasAdmin) {
  console.log("✓ SUPABASE_SERVICE_ROLE_KEY — OK");
} else {
  console.log("✗ SUPABASE_SERVICE_ROLE_KEY — missing");
}

if (missing.length === 0 && hasAdmin) {
  console.log("\n→ Mode: supabase (cloud)\n");
  process.exit(0);
}

console.log("\n→ Mode: demo (localStorage)\n");
console.log("Akhri SUPABASE_VERCEL_SETUP.md\n");
process.exit(missing.length > 0 || !hasAdmin ? 1 : 0);
