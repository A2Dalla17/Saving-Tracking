import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { clearNextCache } from "./ensure-next-cache.mjs";

clearNextCache();

const nodeCache = join(process.cwd(), "node_modules", ".cache");
if (existsSync(nodeCache)) {
  try {
    rmSync(nodeCache, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
    console.log("Removed node_modules/.cache");
  } catch (err) {
    console.warn("Could not remove node_modules/.cache:", err instanceof Error ? err.message : err);
  }
}

console.log("Dev cache cleared — run: npm run dev:win");
