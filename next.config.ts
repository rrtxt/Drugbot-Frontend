import type { NextConfig } from "next";
const destination =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

console.log(`Backend URL: ${destination}`);

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;
