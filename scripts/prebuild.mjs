/** Remove dev-only .next junction before production build (Vercel uses normal .next). */
import { existsSync, lstatSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

const linkPath = join(process.cwd(), ".next");
if (existsSync(linkPath)) {
  try {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      unlinkSync(linkPath);
      console.log("Removed .next junction before build");
    }
  } catch {
    // non-fatal
  }
}
