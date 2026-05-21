import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.6", "0.0.0.0"],
  cacheComponents: true,
};

export default nextConfig;
