import { rmSync } from "node:fs";
import { join } from "node:path";

const targets = [".next", "node_modules/.cache"];

for (const dir of targets) {
  rmSync(join(process.cwd(), dir), { recursive: true, force: true });
  console.log(`Removed ${dir}`);
}

console.log("Dev cache cleared — run: npm run dev:win");
