import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

const SKIP = new Set([
  "sidebar.tsx",
  "page-header.tsx",
  "app-shell.tsx",
  "announcement-banner.tsx",
  "monthly-reminder.tsx",
  "button.tsx",
]);

const REPLACEMENTS = [
  [/text-white\/90/g, "text-muted-foreground"],
  [/text-white\/80/g, "text-muted-foreground"],
  [/text-white\/70/g, "text-muted-foreground"],
  [/text-white\/60/g, "text-muted-foreground"],
  [/text-white\/50/g, "text-muted-foreground"],
  [/text-white/g, "text-card-foreground"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry.endsWith(".tsx")) files.push(full);
  }
  return files;
}

for (const file of walk(ROOT)) {
  if (SKIP.has(file.split(/[/\\]/).pop())) continue;
  let content = readFileSync(file, "utf8");
  const original = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) writeFileSync(file, content);
}

console.log("Card text colors updated");
