import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: without this, Turbopack walks up past this repo
  // looking for a lockfile and warns about one outside the project.
  turbopack: { root: path.resolve(".") },
  // Sites are visited at `<name>.localhost:3000` in development. Without this the dev server
  // refuses those origins its own scripts and hot reload.
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
