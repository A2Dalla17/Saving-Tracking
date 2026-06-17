import { execSync } from "node:child_process";

/** Stop any process listening on port 3000 before wiping .next (prevents 500 errors). */
const port = process.env.PORT ?? "3000";

try {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" }
    );
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore", shell: true });
  }
  console.log(`Stopped any process on port ${port}`);
} catch {
  // no process on port — fine
}
