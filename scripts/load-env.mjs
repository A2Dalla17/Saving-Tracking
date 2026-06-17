#!/usr/bin/env node
/**
 * Load project-root .env.local for Node scripts (check-firebase, etc.).
 * Matches Next.js expectations: one logical line per var; supports quoted multiline.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function getProjectRoot() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function getEnvLocalPath(root = getProjectRoot()) {
  return path.join(root, ".env.local");
}

function stripWrappingQuotes(value) {
  let val = value.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return val;
}

function stripTrailingComma(value) {
  return value.trim().replace(/,\s*$/, "");
}

/** Convert literal \\n sequences to real newlines (PEM keys in .env). */
export function normalizePrivateKey(privateKey) {
  let key = stripTrailingComma(stripWrappingQuotes(privateKey.trim()));
  return key.replace(/\\n/g, "\n");
}

/**
 * Parse .env.local into process.env-style map.
 * Handles: quoted values spanning multiple lines, trailing commas, \\n in PEM keys.
 */
export function parseEnvFile(text) {
  const env = {};
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    i++;

    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();

    // Multiline double-quoted value (opened on this line, not closed yet)
    if (val.startsWith('"') && !val.endsWith('"')) {
      const parts = [val.slice(1)];
      while (i < lines.length) {
        const next = lines[i];
        i++;
        if (next.trim().endsWith('"') || next.trim().endsWith('",')) {
          parts.push(stripTrailingComma(next.trim().replace(/"\s*,?\s*$/, "")));
          break;
        }
        parts.push(next);
      }
      val = parts.join("\n");
    } else if (val.startsWith("'") && !val.endsWith("'")) {
      const parts = [val.slice(1)];
      while (i < lines.length) {
        const next = lines[i];
        i++;
        if (next.trim().endsWith("'") || next.trim().endsWith("',")) {
          parts.push(stripTrailingComma(next.trim().replace(/'\s*,?\s*$/, "")));
          break;
        }
        parts.push(next);
      }
      val = parts.join("\n");
    } else {
      val = stripWrappingQuotes(stripTrailingComma(val));
    }

    env[key] = val.replace(/\\n/g, "\n");
  }

  return env;
}

export function loadEnvLocal(root = getProjectRoot()) {
  const envPath = getEnvLocalPath(root);
  if (!fs.existsSync(envPath)) {
    return { env: {}, envPath, exists: false, bytes: 0 };
  }
  const text = fs.readFileSync(envPath, "utf8");
  const env = parseEnvFile(text);
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }
  return { env, envPath, exists: true, bytes: Buffer.byteLength(text, "utf8") };
}

export function isPrivateKeyValid(raw) {
  return Boolean(raw && normalizePrivateKey(raw).includes("BEGIN PRIVATE KEY"));
}
