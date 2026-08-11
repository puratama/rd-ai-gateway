import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker deployment: produces a minimal standalone server (containers/server.js)
  output: "standalone",
};

export default nextConfig;
