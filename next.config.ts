import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Run migrations on every cold boot in production (idempotent via IF NOT EXISTS).
  // Keep build clean of DB access.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
