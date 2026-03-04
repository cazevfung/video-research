import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Disable server-side features for static export
  trailingSlash: true,
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config to silence the warning - Turbopack is smarter about file watching
  turbopack: {},
};

export default nextConfig;
