import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Real Next.js build folder — outside OneDrive to prevent 500 / ENOENT errors. */
export function getNextCacheRoot() {
  if (process.env.AC7_NEXT_CACHE_DIR) {
    return process.env.AC7_NEXT_CACHE_DIR;
  }
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, "ac7-keydka-next");
  }
  return join(tmpdir(), "ac7-keydka-next");
}

/**
 * Point project .next → LOCALAPPDATA cache via junction (Windows) or symlink.
 * Next.js only accepts relative distDir ".next", so we redirect the folder.
 */
export function ensureNextCacheLink(cwd = process.cwd()) {
  const linkPath = join(cwd, ".next");
  const cacheRoot = getNextCacheRoot();
  mkdirSync(cacheRoot, { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      try {
        unlinkSync(linkPath);
      } catch {
        rmSync(linkPath, { force: true, maxRetries: 5, retryDelay: 200 });
      }
    } else {
      rmSync(linkPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
  }

  if (!existsSync(linkPath)) {
    try {
      symlinkSync(cacheRoot, linkPath, process.platform === "win32" ? "junction" : "dir");
      console.log(`Next cache: ${cacheRoot}`);
    } catch (err) {
      console.warn("Next cache junction skipped:", err instanceof Error ? err.message : err);
    }
  }
}

export function clearNextCache(cwd = process.cwd()) {
  const linkPath = join(cwd, ".next");
  const cacheRoot = getNextCacheRoot();
  const opts = { recursive: true, force: true, maxRetries: 10, retryDelay: 250 };

  for (const target of [cacheRoot, linkPath]) {
    if (!existsSync(target)) continue;
    try {
      const stat = lstatSync(target);
      if (stat.isSymbolicLink()) {
        unlinkSync(target);
      } else {
        rmSync(target, opts);
      }
      console.log(`Removed ${target === cacheRoot ? "Next cache" : ".next"}`);
    } catch (err) {
      console.warn(`Could not remove ${target}:`, err instanceof Error ? err.message : err);
    }
  }

  ensureNextCacheLink(cwd);
}
