import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fixes Vercel/local builds when parent folders have other package-lock.json files
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["firebase-admin"],
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Content-Type", value: "application/manifest+json" }],
    },
  ],
};

export default nextConfig;
