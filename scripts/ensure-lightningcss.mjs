/**
 * WSL often runs Linux Node against a Windows-installed node_modules folder.
 * Fetch missing native platform packages without reinstalling the other OS.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  {
    name: "lightningcss-linux-x64-gnu",
    version: "1.32.0",
    fallback: {
      dir: join(root, "node_modules", "lightningcss"),
      file: "lightningcss.linux-x64-gnu.node",
    },
  },
  {
    name: "lightningcss-win32-x64-msvc",
    version: "1.32.0",
    fallback: {
      dir: join(root, "node_modules", "lightningcss"),
      file: "lightningcss.win32-x64-msvc.node",
    },
  },
  {
    name: "@tailwindcss/oxide-linux-x64-gnu",
    version: "4.3.1",
  },
  {
    name: "@tailwindcss/oxide-win32-x64-msvc",
    version: "4.3.1",
  },
];

function ensurePkg({ name, version, fallback }) {
  const dir = join(root, "node_modules", name);
  if (!existsSync(dir)) {
    console.log(`[ensure-native] Fetching ${name}@${version}...`);
    const packed = execSync(`npm pack ${name}@${version}`, {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .pop()
      ?.trim();

    if (!packed) {
      throw new Error(`Failed to pack ${name}`);
    }

    const tgzPath = join(root, packed);
    mkdirSync(dir, { recursive: true });
    execSync(`tar -xf "${tgzPath}" -C "${dir}" --strip-components=1`, {
      cwd: root,
      stdio: "inherit",
    });
    rmSync(tgzPath, { force: true });
  }

  if (fallback) {
    const source = join(dir, fallback.file);
    const dest = join(fallback.dir, fallback.file);
    if (existsSync(source) && !existsSync(dest)) {
      mkdirSync(fallback.dir, { recursive: true });
      copyFileSync(source, dest);
      console.log(`[ensure-native] Linked ${fallback.file} into lightningcss/`);
    }
  }
}

for (const target of targets) {
  ensurePkg(target);
}
